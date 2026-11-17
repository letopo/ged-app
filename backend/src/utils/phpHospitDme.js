// backend/src/utils/phpHospitDme.js
// Module PHP › Repos & Hospitalisations tenu à jour avec le DME (17/11/2026).
//  - une hospitalisation « en cours » dans la GED dont le patient n'a plus de
//    séjour en cours dans le DME est clôturée : date et type de sortie du
//    séjour DME correspondant (guérison, transfert, décès…) ; sans séjour
//    correspondant, sortie « non datée » ;
//  - un agent PHP hospitalisé dans le DME (séjour en cours) sans
//    hospitalisation en cours dans la GED est ajouté ;
//  - les repos dont la date de fin est passée sont marqués terminés.
// Seules les fiches DME retrouvées de façon sûre (lien enregistré, même
// matricule ou compte Sage) servent : un patient « à vérifier » n'est jamais
// clôturé d'office. Chaque changement est noté sur l'hospitalisation.
import { Op } from 'sequelize';
import { HospitalisationPHP, PatientPHP, ReposPHP, PhpPatientDme } from '../models/index.js';
import { dmeIndisponible, ouvrirDmeTenant } from './dmeIndex.js';
import { rapprocherTousLesPatients, chargerLiens, liensSursEnMemoire } from './phpPatientDme.js';
import { normMatricule } from './phpSageComptes.js';
import { todayLocal } from './phpSuiviDme.js';

const DAY = 86_400_000;
const day = (s) => (s ? String(s).slice(0, 10) : null);
const ecartJours = (a, b) => Math.abs(Date.parse(`${day(a)}T00:00:00Z`) - Date.parse(`${day(b)}T00:00:00Z`)) / DAY;
const fr = (s) => (s ? new Date(`${day(s)}T12:00:00`).toLocaleDateString('fr-FR') : '');
const STATUT_SORTIE = { deces: 'deces', transfert: 'transfert' };
const TYPE_SORTIE = { guerison: 'guérison', amelioration: 'amélioration', transfert: 'transfert', deces: 'décès', fuite: 'fuite', abandon: 'abandon' };

/**
 * Décision pour une hospitalisation en cours de la GED.
 * sejours : séjours DME des fiches sûres du patient { id, date_admission, date_sortie_effective, statut, type_sortie, service }.
 * → { action: 'garder'|'cloturer'|'aucune', etat, sejour?, dateSortie?, status?, note? }
 */
export function deciderHospit(hosp, sejours, { trouve, dossier }) {
  if (!trouve) return { action: 'aucune', etat: { code: 'introuvable', label: 'Patient non retrouvé dans le DME' } };
  const ouverts = sejours.filter((s) => !s.date_sortie_effective && s.statut !== 'termine');
  const proche = [...sejours].sort((a, b) => ecartJours(a.date_admission, hosp.dateEntree) - ecartJours(b.date_admission, hosp.dateEntree))
    .find((s) => ecartJours(s.date_admission, hosp.dateEntree) <= 3);
  // Toujours hospitalisé : le séjour correspondant (ou un séjour ouvert commencé avant/au même moment) est en cours
  const enCours = (proche && ouverts.includes(proche)) ? proche
    : ouverts.find((s) => Date.parse(`${day(s.date_admission)}T00:00:00Z`) <= Date.parse(`${day(hosp.dateEntree)}T00:00:00Z`) + 3 * DAY);
  if (enCours) {
    return { action: 'garder', sejour: enCours, etat: { code: 'hospitalise', label: `Hospitalisé dans le DME${enCours.service ? ` · ${enCours.service}` : ''}`, depuis: day(enCours.date_admission), dossier } };
  }
  // Plus hospitalisé : sortie du séjour correspondant, sinon du premier séjour terminé après l'entrée
  const sortiApres = proche && proche.date_sortie_effective ? proche
    : sejours.filter((s) => s.date_sortie_effective && day(s.date_sortie_effective) >= day(hosp.dateEntree))
      .sort((a, b) => String(a.date_sortie_effective).localeCompare(String(b.date_sortie_effective)))[0];
  if (sortiApres) {
    const type = TYPE_SORTIE[sortiApres.type_sortie];
    return {
      action: 'cloturer', sejour: sortiApres, dateSortie: day(sortiApres.date_sortie_effective), status: STATUT_SORTIE[sortiApres.type_sortie] || 'sorti',
      note: `Sortie relevée dans le DME${dossier ? ` (dossier ${dossier})` : ''} : le ${fr(sortiApres.date_sortie_effective)}${type ? `, ${type}` : ''}.`,
      etat: { code: 'sorti', label: 'Sorti dans le DME' },
    };
  }
  return {
    action: 'cloturer', dateSortie: null, status: 'sorti',
    note: `Plus hospitalisé dans le DME${dossier ? ` (dossier ${dossier})` : ''} : aucun séjour en cours ni sortie enregistrée après le ${fr(hosp.dateEntree)} — date de sortie inconnue.`,
    etat: { code: 'sorti', label: 'Plus hospitalisé dans le DME' },
  };
}

const derniere = new Map();
/**
 * Met à jour les hospitalisations et les repos du Module PHP.
 * `siPlusVieuxQue` (ms) : ne refait rien si la dernière mise à jour est plus récente.
 * → { disponible, raison?, clotures, ajouts, reposTermines, etats: { [hospId]: etat }, at, erreur? }
 */
export async function synchroniserHospitalisations(tenantId, { siPlusVieuxQue = 0, simulation = false } = {}) {
  const last = derniere.get(tenantId);
  if (siPlusVieuxQue && last && Date.now() - last.at < siPlusVieuxQue) return { ...last.resultat, enCache: true };
  const today = todayLocal();

  // Repos : date de fin passée → terminé (sans le DME)
  const reposWhere = { status: { [Op.in]: ['en_cours', 'prolonge'] }, dateFin: { [Op.lt]: today }, patientId: { [Op.in]: (await PatientPHP.findAll({ where: { tenantId }, attributes: ['id'] })).map((p) => p.id) } };
  const reposTermines = simulation ? await ReposPHP.count({ where: reposWhere }) : (await ReposPHP.update({ status: 'termine' }, { where: reposWhere }))[0];

  const raison = await dmeIndisponible(tenantId);
  if (raison) {
    const resultat = { disponible: false, raison, clotures: 0, ajouts: 0, reposTermines, etats: {}, at: new Date().toISOString() };
    derniere.set(tenantId, { at: Date.now(), resultat });
    return resultat;
  }

  // Les liens patients ↔ DME servent de base : rapprochement de tous les patients au plus une fois par 12 h
  if (!simulation) await rapprocherTousLesPatients(tenantId, { siPlusVieuxQue: 12 * 3600_000 }).catch((err) => console.error('Rapprochement DME :', err.message));

  const hosps = await HospitalisationPHP.findAll({
    where: { status: 'en_cours' },
    include: [{ model: PatientPHP, as: 'patient', attributes: ['id', 'matricule'], where: { tenantId }, required: true }],
  });
  const liensConfirmes = simulation ? await liensSursEnMemoire(tenantId)
    : await PhpPatientDme.findAll({ where: { tenantId, statut: 'confirme' }, attributes: ['patientId', 'dmePatientId', 'dossierNumero'] });
  const fichesDe = new Map();
  for (const l of liensConfirmes) fichesDe.set(l.patientId, [...(fichesDe.get(l.patientId) || []), l]);

  const conn = await ouvrirDmeTenant(tenantId);
  let clotures = 0, ajouts = 0;
  const etats = {};
  try {
    const [services] = await conn.query('SELECT id, nom_service FROM services');
    const svc = new Map(services.map((s) => [s.id, s.nom_service]));
    const lire = async (ids) => {
      if (!ids.length) return [];
      const [rows] = await conn.query(`SELECT id, patient_id, date_admission, date_sortie_effective, statut, type_sortie, service_id, diagnostic_entree_libelle
        FROM hospitalisations WHERE patient_id IN (${ids.map(() => '?').join(', ')})`, ids);
      return rows.map((r) => ({ ...r, service: svc.get(r.service_id) || null }));
    };

    // 1. Hospitalisations en cours de la GED
    const idsDme = [...new Set(hosps.flatMap((h) => (fichesDe.get(h.patientId) || []).map((l) => l.dmePatientId)))];
    const sejours = await lire(idsDme);
    for (const h of hosps) {
      const liens = fichesDe.get(h.patientId) || [];
      const ids = new Set(liens.map((l) => l.dmePatientId));
      const d = deciderHospit(h, sejours.filter((s) => ids.has(s.patient_id)), { trouve: liens.length > 0, dossier: liens.map((l) => l.dossierNumero).filter(Boolean).join(', ') || null });
      etats[h.id] = d.etat;
      if (d.action !== 'cloturer') continue;
      const dureeSejour = d.dateSortie ? Math.max(0, Math.round((Date.parse(d.dateSortie) - Date.parse(day(h.dateEntree))) / DAY)) : null;
      if (!simulation) await h.update({ status: d.status, dateSortie: d.dateSortie, dureeSejour, notes: [h.notes, d.note].filter(Boolean).join('\n') });
      clotures++;
      if (simulation) (etats[h.id] = { ...d.etat, simulation: { status: d.status, dateSortie: d.dateSortie } });
    }

    // 2. Agents PHP hospitalisés dans le DME sans hospitalisation en cours dans la GED
    const [ouverts] = await conn.query(`SELECT h.id, h.patient_id, h.date_admission, h.service_id, h.diagnostic_entree_libelle, p.matricule_agent, p.type_client, p.dossier_numero
      FROM hospitalisations h JOIN patients p ON p.id = h.patient_id
      WHERE h.date_sortie_effective IS NULL AND (h.statut IS NULL OR h.statut <> 'termine')`);
    if (ouverts.length) {
      const parFiche = new Map(liensConfirmes.map((l) => [l.dmePatientId, l.patientId]));
      const patients = await PatientPHP.findAll({ where: { tenantId }, attributes: ['id', 'matricule'] });
      const parMat = new Map();
      for (const p of patients) { const m = normMatricule(p.matricule); if (m) parMat.set(m, [...(parMat.get(m) || []), p.id]); }
      const liens = await chargerLiens(tenantId, patients.map((p) => p.id));
      const enCours = new Set((await HospitalisationPHP.findAll({ where: { status: 'en_cours', patientId: { [Op.in]: patients.map((p) => p.id) } }, attributes: ['patientId'] })).map((h) => h.patientId));
      for (const o of ouverts) {
        let patientId = parFiche.get(o.patient_id);
        if (!patientId && o.type_client === 'AGENTS_PHP') {
          const c = parMat.get(normMatricule(o.matricule_agent)) || [];
          if (c.length === 1 && !liens.get(c[0])?.ecartes.includes(o.patient_id)) patientId = c[0];
        }
        if (!patientId || enCours.has(patientId)) continue;
        // Déjà saisie (même jour ± 1) dans la GED, même close : on ne la recrée pas
        const entree = day(o.date_admission);
        const existe = await HospitalisationPHP.findOne({ where: { patientId, dateEntree: { [Op.between]: [day(new Date(Date.parse(entree) - DAY).toISOString()), day(new Date(Date.parse(entree) + DAY).toISOString())] } }, attributes: ['id'] });
        if (existe) continue;
        if (!simulation) await HospitalisationPHP.create({
          patientId, dateEntree: entree, status: 'en_cours', serviceHospitalisation: svc.get(o.service_id) || null,
          diagnostic: o.diagnostic_entree_libelle || null,
          notes: `Hospitalisation relevée dans le DME${o.dossier_numero ? ` (dossier ${o.dossier_numero})` : ''}, entrée le ${fr(o.date_admission)}.`,
        });
        enCours.add(patientId);
        ajouts++;
      }
    }
  } finally {
    await conn.end().catch(() => {});
  }
  const resultat = { disponible: true, simulation, clotures, ajouts, reposTermines, etats, at: new Date().toISOString() };
  if (!simulation) derniere.set(tenantId, { at: Date.now(), resultat });
  return resultat;
}

/** État DME des hospitalisations (dernière mise à jour), pour l'affichage. */
export const etatsHospit = (tenantId) => derniere.get(tenantId)?.resultat?.etats || {};

/**
 * Clôture (sans date de sortie) des hospitalisations en cours entrées il y a
 * plus de `joursMin` jours et dont le patient n'est pas retrouvé dans le DME
 * (selon la dernière mise à jour). Action manuelle, confirmée à l'écran.
 */
export async function cloturerAnciennes(tenantId, joursMin, user) {
  const etats = etatsHospit(tenantId);
  const limite = new Date(Date.now() - joursMin * DAY).toISOString().slice(0, 10);
  const hosps = await HospitalisationPHP.findAll({
    where: { status: 'en_cours', dateEntree: { [Op.lt]: limite } },
    include: [{ model: PatientPHP, as: 'patient', attributes: ['id'], where: { tenantId }, required: true }],
  });
  const qui = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'un utilisateur';
  let n = 0;
  for (const h of hosps) {
    if (etats[h.id]?.code !== 'introuvable') continue;
    await h.update({ status: 'sorti', dateSortie: null, dureeSejour: null, notes: [h.notes, `Clôturée le ${fr(new Date().toISOString())} par ${qui} : ancienne hospitalisation (plus de ${joursMin} jours) non retrouvée dans le DME, date de sortie inconnue.`].filter(Boolean).join('\n') });
    delete etats[h.id];
    n++;
  }
  return { clotures: n };
}

/** Nombre d'hospitalisations « anciennes et non retrouvées » (pour le bouton). */
export async function compterAnciennes(tenantId, joursMin = 30) {
  const etats = etatsHospit(tenantId);
  const limite = new Date(Date.now() - joursMin * DAY).toISOString().slice(0, 10);
  const hosps = await HospitalisationPHP.findAll({ where: { status: 'en_cours', dateEntree: { [Op.lt]: limite } }, attributes: ['id'],
    include: [{ model: PatientPHP, as: 'patient', attributes: [], where: { tenantId }, required: true }] });
  return hosps.filter((h) => etats[h.id]?.code === 'introuvable').length;
}
