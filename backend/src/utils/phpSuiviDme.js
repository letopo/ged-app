// backend/src/utils/phpSuiviDme.js
// Suivi DME des consultations PHP (17/11/2026) : pour chaque patient inscrit
// chez l'agent PHP (page Consultations PHP), on retrouve sa fiche dans le DME
// et on montre où il en est :
//  - aujourd'hui : l'étape en cours du DME (patients.statut_parcours : accueil,
//    paramètres, attente du médecin, en consultation, sorti…) ;
//  - et, pour le jour choisi, la frise : consultation → labo → imagerie →
//    pharmacie (ordonnances_pharmacie + ordonnance_medicaments, ouvertes à la
//    GED le 20/11/2026).
// Lecture seule, en direct. Le DME enregistre ses dates à l'heure locale.
import { Op } from 'sequelize';
import { ConsultationPHP, PatientPHP, TenantIntegration } from '../models/index.js';
import { decryptSecret } from './secretBox.js';
import { openDme } from './dmeConnection.js';
import { PhpPatientCompteSage } from '../models/index.js';
import { rechercherDansDme, resumeFiche } from './dmePatientSearch.js';
import { indexDuTenant } from './dmeIndex.js';
import { chargerLiens, lierAutomatiquement } from './phpPatientDme.js';
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
// Ordonnance vue par la pharmacie (ordonnances_pharmacie.statut)
const PHARMA_STATUTS = {
  BROUILLON: 'en rédaction par le médecin', EN_ATTENTE: 'en attente à la pharmacie', SIGNEE: 'transmise à la pharmacie',
  A_VALIDER: 'à valider', EN_COURS: 'délivrance en cours', PARTIEL: 'délivrée en partie', COMPLET: 'délivrée', TERMINEE: 'délivrée', ANNULEE: 'annulée',
};
const plur = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const DEVENIRS = { SORTIE: 'sortie', HOSPITALISATION: 'hospitalisation', OBSERVATION: 'mise en observation', RDV_SPECIALISTE: 'RDV spécialiste' };

const hm = (s) => (s ? String(s).slice(11, 16) : null);
const day = (s) => (s ? String(s).slice(0, 10) : null);
/**
 * Suivi d'un patient pour une date, à partir de ses fiches DME et des
 * événements du jour (consultations, demandes labo et imagerie).
 */
export function suiviDuPatient({ fiches, confiance = 'sure', doublons = false, ecartMatricule = null }, { consultations = [], labos = [], imageries = [], ordonnances = [], derniers = [] }, { date, today, services = new Map() }) {
  const idsFiches = new Set(fiches.map((f) => f.id));
  const dernierPassage = derniers.filter((d) => idsFiches.has(d.patient_id)).map((d) => String(d.d).slice(0, 16)).sort().pop() || null;
  const recherche = { confiance, doublons, ecartMatricule, dernierPassage, fiches: fiches.map(resumeFiche) };
  if (!fiches.length) return { trouve: false, ...recherche, etat: { code: 'introuvable', label: 'Pas retrouvé dans le DME', tone: 'neutre' }, frise: [] };
  if (confiance === 'ambigu') return { trouve: true, ...recherche, etat: { code: 'ambigu', label: `${fiches.length} fiches possibles`, tone: 'alerte' }, frise: [] };
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
  for (const o of mine(ordonnances)) {
    const lignes = Number(o.nb_lignes) || 0;
    const delivrees = Number(o.nb_delivrees) || 0;
    const horsStock = Number(o.nb_hors_stock) || 0;
    const termine = ['TERMINEE', 'COMPLET'].includes(o.statut);
    const details = [
      lignes ? plur(lignes, 'médicament') : null,
      termine && delivrees && delivrees < lignes ? `${delivrees} délivré${delivrees > 1 ? 's' : ''}` : null,
      horsStock ? `${horsStock} hors stock` : null,
      !termine && o.lu_pharmacie_le ? `vue par la pharmacie à ${hm(o.lu_pharmacie_le)}` : null,
    ].filter(Boolean);
    frise.push({
      kind: 'pharmacie', heure: hm(o.date_creation),
      fin: termine && o.date_traitement && day(o.date_traitement) === date ? hm(o.date_traitement) : null,
      titre: `Pharmacie · ordonnance${o.type_ordonnance === 'PAR_ORDRE' ? ' (par ordre)' : ''}`,
      statut: PHARMA_STATUTS[o.statut] || String(o.statut || '').toLowerCase() || null,
      termine, annule: o.statut === 'ANNULEE',
      detail: details.length ? details.join(' · ') : null,
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
    else if (frise.some((e) => e.kind !== 'pharmacie')) etat = { code: 'examens', label: 'Examens en cours', tone: 'encours' };
    else if (frise.length) etat = { code: 'pharmacie', label: 'Ordonnance à la pharmacie', tone: 'encours' };
    else etat = { code: 'pas_de_passage', label: date === today ? 'Fiche trouvée · pas encore arrivé' : 'Fiche trouvée · pas de passage ce jour', tone: 'neutre' };
  }
  if (vu?.heure && !etat.heure) etat.heure = vu.heure;
  return { trouve: true, ...recherche, etat, frise };
}

/**
 * Suivi DME de consultations PHP (ids de la page affichée), pour une date.
 * Jamais d'exception pour un DME injoignable : `erreur` est renseignée.
 */
export async function suiviDme({ tenantId, date, consultationIds }) {
  const today = todayLocal();
  const base = { date, today, pharmacie: null, suivis: {} };
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
    const index = await indexDuTenant(tenantId, conn);
    const decisions = await PhpPatientCompteSage.findAll({ where: { tenantId, patientId: [...new Set(consults.map((c) => c.patient.id))], statut: 'confirme' }, attributes: ['patientId', 'compteTiers'] });
    const comptesDe = (id) => decisions.filter((d) => d.patientId === id).map((d) => d.compteTiers);
    const liens = await chargerLiens(tenantId, [...new Set(consults.map((c) => c.patient.id))]);
    const matches = new Map(consults.map((c) => [c.id, rechercherDansDme({ ...c.patient.get({ plain: true }), comptes: comptesDe(c.patient.id), liens: liens.get(c.patient.id) }, index)]));
    // Liens sûrs (même matricule / compte Sage) enregistrés d'office, une fois par patient
    const parPatient = new Map(consults.map((c) => [c.patient.id, { patientId: c.patient.id, recherche: matches.get(c.id), liens: liens.get(c.patient.id) }]));
    const ajoutes = await lierAutomatiquement(tenantId, [...parPatient.values()]);
    const liensApres = ajoutes ? await chargerLiens(tenantId, [...parPatient.keys()]) : liens;
    const ids = [...new Set([...matches.values()].flatMap((m) => m.fiches.map((f) => f.id)))];
    let events = {};
    let services = new Map();
    let pharmacie = null;
    if (ids.length) {
      const inIds = ids.map(() => '?').join(', ');
      const [etapes] = await conn.query(`SELECT id, statut_parcours, GREATEST(COALESCE(date_modification, '1970-01-01'), COALESCE(updated_at, '1970-01-01')) AS modifie FROM patients WHERE id IN (${inIds})`, ids);
      const etapeDe = new Map(etapes.map((e) => [e.id, e]));
      for (const m of matches.values()) m.fiches = m.fiches.map((f) => ({ ...f, ...etapeDe.get(f.id) }));
      const range = [date, date];
      const [[svc], [consultations], [labos], [imageries], [derniers]] = await Promise.all([
        conn.query('SELECT id, nom_service FROM services'),
        conn.query(`SELECT id, patient_id, date_consultation, date_cloture, statut, service_id, devenir FROM consultations
          WHERE patient_id IN (${inIds}) AND date_consultation >= ? AND date_consultation < DATE_ADD(?, INTERVAL 1 DAY)`, [...ids, ...range]),
        conn.query(`SELECT id, patient_id, date_creation, statut, date_resultats, remis_le FROM demandes_laboratoire
          WHERE patient_id IN (${inIds}) AND date_creation >= ? AND date_creation < DATE_ADD(?, INTERVAL 1 DAY)`, [...ids, ...range]),
        conn.query(`SELECT id, patient_id, date_creation, statut, type_examen, type_imagerie, date_resultats FROM demandes_imagerie
          WHERE patient_id IN (${inIds}) AND date_creation >= ? AND date_creation < DATE_ADD(?, INTERVAL 1 DAY)`, [...ids, ...range]),
        // Dernier passage avant ce jour (consultation, labo ou imagerie)
        conn.query(`SELECT patient_id, MAX(d) AS d FROM (
            SELECT patient_id, date_consultation AS d FROM consultations WHERE patient_id IN (${inIds}) AND date_consultation < ?
            UNION ALL SELECT patient_id, date_creation FROM demandes_laboratoire WHERE patient_id IN (${inIds}) AND date_creation < ?
            UNION ALL SELECT patient_id, date_creation FROM demandes_imagerie WHERE patient_id IN (${inIds}) AND date_creation < ?
          ) x GROUP BY patient_id`, [...ids, date, ...ids, date, ...ids, date]),
      ]);
      services = new Map(svc.map((s) => [s.id, s.nom_service]));
      // Pharmacie : à part, pour que le reste du suivi s'affiche même si le DME
      // retire un jour ce droit de lecture
      let ordonnances = [];
      try {
        [ordonnances] = await conn.query(`SELECT op.id, op.patient_id, op.statut, op.type_ordonnance, op.date_creation, op.date_traitement, op.lu_pharmacie_le,
            SUM(om.id IS NOT NULL AND COALESCE(om.ligne_annulee, 0) = 0) AS nb_lignes,
            SUM(om.delivre = 1 AND COALESCE(om.ligne_annulee, 0) = 0) AS nb_delivrees,
            SUM(om.hors_stock = 1 AND COALESCE(om.ligne_annulee, 0) = 0) AS nb_hors_stock
          FROM ordonnances_pharmacie op LEFT JOIN ordonnance_medicaments om ON om.ordonnance_id = op.id
          WHERE op.patient_id IN (${inIds}) AND op.date_creation >= ? AND op.date_creation < DATE_ADD(?, INTERVAL 1 DAY)
          GROUP BY op.id`, [...ids, ...range]);
        pharmacie = 'ok';
      } catch (err) {
        pharmacie = err.code === 'ER_TABLEACCESS_DENIED_ERROR' ? 'droit_manquant' : 'erreur';
        console.warn('⚠️ Suivi DME : pharmacie illisible :', err.code || err.message);
      }
      events = { consultations, labos, imageries, ordonnances, derniers };
    }
    const suivis = {};
    for (const c of consults) {
      const l = liensApres.get(c.patient.id) || { rows: [] };
      const decision = new Map(l.rows.map((r) => [r.dmePatientId, r]));
      const suivi = suiviDuPatient(matches.get(c.id), events, { date, today, services });
      suivi.patientId = c.patient.id;
      suivi.fiches = suivi.fiches.map((f) => ({ ...f, lien: decision.get(f.id)?.statut || null, lienSource: decision.get(f.id)?.source || null }));
      // Fiches écartées : listées pour pouvoir revenir sur la décision
      suivi.ecartees = l.rows.filter((r) => r.statut === 'ecarte').map((r) => ({ id: r.dmePatientId, dossier: r.dossierNumero, nom: r.dmeNom }));
      suivis[c.id] = suivi;
    }
    return { ...base, pharmacie, disponible: true, suivis };
  } catch (err) {
    return { ...base, disponible: true, erreur: err.message };
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
