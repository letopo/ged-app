// backend/src/utils/phpSuiviDme.js
// Suivi DME des consultations PHP (17/11/2026) : pour chaque patient inscrit
// chez l'agent PHP (page Consultations PHP), on retrouve sa fiche dans le DME
// et on montre où il en est :
//  - aujourd'hui : l'étape en cours du DME (patients.statut_parcours : accueil,
//    paramètres, attente du médecin, en consultation, sorti…) ;
//  - et, pour le jour choisi, la frise : consultation → labo → imagerie.
// Lecture seule, en direct. Le DME enregistre ses dates à l'heure locale.
// La pharmacie n'est pas encore lisible : la table `ordonnances` n'est pas
// ouverte au compte de lecture de la GED.
import { Op } from 'sequelize';
import { ConsultationPHP, PatientPHP, TenantIntegration } from '../models/index.js';
import { decryptSecret } from './secretBox.js';
import { openDme } from './dmeConnection.js';
import { normMatricule } from './phpSageComptes.js';
import { isModuleActive } from './tenantModules.js';

export const TZ = 'Africa/Douala';
export const todayLocal = (now = new Date()) => now.toLocaleDateString('sv-SE', { timeZone: TZ });

// Étape du DME (patients.statut_parcours) → libellé et ton affichés
export const ETAPES = {
  ACCUEIL: { code: 'accueil', label: 'À l’accueil', tone: 'attente' },
  TRIAGE: { code: 'triage', label: 'Au tri', tone: 'attente' },
  PARAMETRES: { code: 'parametres', label: 'Aux paramètres', tone: 'attente' },
  PARAMETRES_MATERNITE: { code: 'parametres', label: 'Aux paramètres (maternité)', tone: 'attente' },
  ATTENTE_CONSULTATION: { code: 'attente', label: 'En attente du médecin', tone: 'attente' },
  ATTENTE_SPECIALISTE: { code: 'attente', label: 'En attente du spécialiste', tone: 'attente' },
  EN_CONSULTATION: { code: 'en_consultation', label: 'En consultation', tone: 'encours' },
  URGENCES: { code: 'urgences', label: 'Aux urgences', tone: 'encours' },
  HOSPITALISE: { code: 'hospitalise', label: 'Hospitalisé', tone: 'alerte' },
  SORTI: { code: 'sorti', label: 'Sorti', tone: 'fini' },
  ABSENT_24H: { code: 'absent', label: 'Absent', tone: 'neutre' },
  NOUVEAU_NE: { code: 'nouveau_ne', label: 'Nouveau-né', tone: 'neutre' },
  DECEDE_ARRIVEE: { code: 'decede', label: 'Décédé à l’arrivée', tone: 'alerte' },
};

const LABO_STATUTS = {
  EN_ATTENTE: 'en attente', DISPATCHE: 'transmise au labo', EN_ANALYSE: 'en analyse', A_VALIDER: 'résultats à valider',
  RESULTATS_PRETS: 'résultats prêts', VALIDES: 'résultats validés', NON_REALISEE: 'non réalisée', ANNULEE: 'annulée',
};
const IMAGERIE_TYPES = { radiographie: 'Radio', scanner: 'Scanner', irm: 'IRM', echographie: 'Échographie', mammographie: 'Mammographie' };
const CONSULT_STATUTS = { en_cours: 'en cours', terminee: 'terminée', validee: 'validée', annulee: 'annulée' };
const DEVENIRS = { SORTIE: 'sortie', HOSPITALISATION: 'hospitalisation', OBSERVATION: 'mise en observation', RDV_SPECIALISTE: 'RDV spécialiste' };

const hm = (s) => (s ? String(s).slice(11, 16) : null);
const day = (s) => (s ? String(s).slice(0, 10) : null);
export const normNom = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');

/**
 * Retrouve la fiche DME d'un patient PHP : par matricule (exact une fois
 * normalisé), sinon par nom + prénom parmi les agents PHP sans matricule, si
 * un seul correspond. Plusieurs fiches pour le même matricule : on les garde
 * toutes (doublons du DME), la frise les réunit.
 */
export function matchDmePatients(patient, dmePatients) {
  const mat = normMatricule(patient.matricule);
  if (mat) {
    const parMat = dmePatients.filter((p) => normMatricule(p.matricule_agent) === mat);
    if (parMat.length) return { fiches: parMat, par: 'matricule' };
  }
  const nom = normNom(`${patient.nom || ''}${patient.prenom || ''}`);
  if (nom.length < 4) return { fiches: [], par: null };
  const parNom = dmePatients.filter((p) => p.type_client === 'AGENTS_PHP' && !normMatricule(p.matricule_agent) && normNom(`${p.nom || ''}${p.prenom || ''}`) === nom);
  return parNom.length === 1 ? { fiches: parNom, par: 'nom' } : { fiches: [], par: null };
}

/**
 * Suivi d'un patient pour une date, à partir de ses fiches DME et des
 * événements du jour (consultations, demandes labo et imagerie).
 */
export function suiviDuPatient({ fiches, par }, { consultations = [], labos = [], imageries = [] }, { date, today, services = new Map() }) {
  if (!fiches.length) return { trouve: false, etat: { code: 'introuvable', label: 'Pas retrouvé dans le DME', tone: 'neutre' }, frise: [] };
  const ids = new Set(fiches.map((f) => f.id));
  const mine = (rows) => rows.filter((r) => ids.has(r.patient_id));
  const svc = (id) => services.get(id) || null;

  const frise = [];
  for (const c of mine(consultations)) {
    const devenir = DEVENIRS[c.devenir] || null;
    frise.push({
      kind: 'consultation', heure: hm(c.date_consultation), fin: day(c.date_cloture) === date ? hm(c.date_cloture) : null,
      titre: `Consultation${svc(c.service_id) ? ` · ${svc(c.service_id)}` : ''}`,
      statut: CONSULT_STATUTS[c.statut] || c.statut, termine: c.statut === 'terminee' || c.statut === 'validee', annule: c.statut === 'annulee',
      detail: devenir ? `Devenir : ${devenir}` : null,
    });
  }
  for (const l of mine(labos)) {
    frise.push({
      kind: 'labo', heure: hm(l.date_creation), titre: 'Laboratoire',
      statut: LABO_STATUTS[l.statut] || String(l.statut || '').toLowerCase() || null,
      termine: ['RESULTATS_PRETS', 'VALIDES'].includes(l.statut), annule: ['ANNULEE', 'NON_REALISEE'].includes(l.statut),
      detail: l.remis_le ? `Résultats remis à ${hm(l.remis_le)}${day(l.remis_le) !== date ? ` le ${day(l.remis_le)}` : ''}` : (l.date_resultats ? `Résultats à ${hm(l.date_resultats)}` : null),
    });
  }
  for (const im of mine(imageries)) {
    const type = IMAGERIE_TYPES[im.type_examen] || im.type_imagerie || 'Imagerie';
    frise.push({
      kind: 'imagerie', heure: hm(im.date_creation), titre: `Imagerie · ${type}`,
      statut: im.statut === 'termine' ? 'réalisée' : (im.statut === 'EN_ATTENTE' ? 'en attente' : String(im.statut || '').toLowerCase() || null),
      termine: im.statut === 'termine', annule: false,
      detail: im.date_resultats ? `Résultats à ${hm(im.date_resultats)}` : null,
    });
  }
  frise.sort((a, b) => String(a.heure).localeCompare(String(b.heure)));

  const consults = frise.filter((e) => e.kind === 'consultation' && !e.annule);
  const vu = consults.find((e) => e.termine);
  let etat = null;
  // Aujourd'hui : l'étape en cours du DME, si la fiche a bougé aujourd'hui
  if (date === today) {
    const fiche = [...fiches].sort((a, b) => String(b.modifie || '').localeCompare(String(a.modifie || '')))[0];
    const e = ETAPES[fiche.statut_parcours];
    if (e && day(fiche.modifie) === today) {
      etat = { ...e };
      if (e.code === 'sorti' && vu) etat = { code: 'vu', label: 'Vu par le médecin, sorti', tone: 'fini' };
      if (e.code === 'absent' && consults.length) etat = null; // « absent » posé par le DME après coup
    }
  }
  if (!etat) {
    if (vu) etat = { code: 'vu', label: 'Vu par le médecin', tone: 'fini' };
    else if (consults.length) etat = { code: 'en_consultation', label: 'En consultation', tone: 'encours' };
    else if (frise.length) etat = { code: 'examens', label: 'Examens en cours', tone: 'encours' };
    else etat = { code: 'pas_de_passage', label: date === today ? 'Pas encore au DME' : 'Aucun passage au DME', tone: 'neutre' };
  }
  if (vu?.heure && !etat.heure) etat.heure = vu.heure;
  return { trouve: true, par, etat, frise };
}

/**
 * Suivi DME de consultations PHP (ids de la page affichée), pour une date.
 * Jamais d'exception pour un DME injoignable : `erreur` est renseignée.
 */
export async function suiviDme({ tenantId, date, consultationIds }) {
  const today = todayLocal();
  const base = { date, today, pharmacie: 'droit_manquant', suivis: {} };
  if (!(await isModuleActive(tenantId, 'dme'))) return { ...base, disponible: false, raison: 'Module « Liaison DME » non activé.' };
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'dme' } });
  if (!row?.secretEncrypted || !row.config?.host || row.enabled === false) return { ...base, disponible: false, raison: 'Connexion au DME non réglée (Paramètres › Intégrations › DME).' };

  const consults = consultationIds.length ? await ConsultationPHP.findAll({
    where: { id: { [Op.in]: consultationIds } },
    attributes: ['id', 'patientId', 'dateConsultation'],
    include: [{ model: PatientPHP, as: 'patient', attributes: ['id', 'matricule', 'nom', 'prenom'], where: { tenantId }, required: true }],
  }) : [];
  if (!consults.length) return { ...base, disponible: true };

  let conn;
  try {
    conn = await openDme(row.config, decryptSecret(row.secretEncrypted));
    const [dmePatients] = await conn.query(`
      SELECT id, nom, prenom, type_client, matricule_agent, statut_parcours, GREATEST(COALESCE(date_modification, '1970-01-01'), COALESCE(updated_at, '1970-01-01')) AS modifie
      FROM patients WHERE type_client = 'AGENTS_PHP' OR (matricule_agent IS NOT NULL AND matricule_agent <> '')`);
    const matches = new Map(consults.map((c) => [c.id, matchDmePatients(c.patient, dmePatients)]));
    const ids = [...new Set([...matches.values()].flatMap((m) => m.fiches.map((f) => f.id)))];
    let events = {};
    let services = new Map();
    if (ids.length) {
      const inIds = ids.map(() => '?').join(', ');
      const range = [date, date];
      const [[svc], [consultations], [labos], [imageries]] = await Promise.all([
        conn.query('SELECT id, nom_service FROM services'),
        conn.query(`SELECT id, patient_id, date_consultation, date_cloture, statut, service_id, devenir FROM consultations
          WHERE patient_id IN (${inIds}) AND date_consultation >= ? AND date_consultation < DATE_ADD(?, INTERVAL 1 DAY)`, [...ids, ...range]),
        conn.query(`SELECT id, patient_id, date_creation, statut, date_resultats, remis_le FROM demandes_laboratoire
          WHERE patient_id IN (${inIds}) AND date_creation >= ? AND date_creation < DATE_ADD(?, INTERVAL 1 DAY)`, [...ids, ...range]),
        conn.query(`SELECT id, patient_id, date_creation, statut, type_examen, type_imagerie, date_resultats FROM demandes_imagerie
          WHERE patient_id IN (${inIds}) AND date_creation >= ? AND date_creation < DATE_ADD(?, INTERVAL 1 DAY)`, [...ids, ...range]),
      ]);
      services = new Map(svc.map((s) => [s.id, s.nom_service]));
      events = { consultations, labos, imageries };
    }
    const suivis = {};
    for (const c of consults) suivis[c.id] = suiviDuPatient(matches.get(c.id), events, { date, today, services });
    return { ...base, disponible: true, suivis };
  } catch (err) {
    return { ...base, disponible: true, erreur: err.message };
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
