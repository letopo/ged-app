// backend/src/utils/phpPatientDme.js
// Lien patient PHP ↔ fiche(s) du DME (17/11/2026).
//  - automatique : une fiche retrouvée par le même matricule ou le même compte
//    Sage est enregistrée « confirmée » (source auto), sauf si elle est déjà
//    liée à un autre patient PHP ;
//  - à la main (saisie PHP) : « C'est lui », « Ce n'est pas lui », ou un n° de
//    dossier DME saisi, vérifié dans le DME.
// La recherche (dmePatientSearch) retient toujours une fiche confirmée et ne
// reprend jamais une fiche écartée. Le n° de dossier permet de retrouver le
// patient PHP par son numéro DME.
import { Op } from 'sequelize';
import { PhpPatientDme, PatientPHP, TenantIntegration } from '../models/index.js';
import { decryptSecret } from './secretBox.js';
import { openDme } from './dmeConnection.js';
import { isModuleActive } from './tenantModules.js';
import { PhpPatientCompteSage } from '../models/index.js';
import { rechercherDansDme, resumeFiche } from './dmePatientSearch.js';
import { dmeIndisponible, ouvrirDmeTenant, indexDuTenant } from './dmeIndex.js';

const userName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || null;
const nomFiche = (f) => [f?.nom, f?.prenom].filter(Boolean).join(' ').slice(0, 220) || null;
const httpError = (status, message) => Object.assign(new Error(message), { status });

/** Décisions enregistrées, par patient : { confirmes: [id], ecartes: [id], rows } */
export async function chargerLiens(tenantId, patientIds) {
  const map = new Map(patientIds.map((id) => [id, { confirmes: [], ecartes: [], rows: [] }]));
  if (!patientIds.length) return map;
  const rows = await PhpPatientDme.findAll({ where: { tenantId, patientId: { [Op.in]: patientIds } } });
  for (const r of rows) {
    const m = map.get(r.patientId);
    if (!m) continue;
    m.rows.push(r);
    (r.statut === 'confirme' ? m.confirmes : m.ecartes).push(r.dmePatientId);
  }
  return map;
}

/**
 * Liens automatiques après une recherche : fiches retenues par le même
 * matricule ou compte Sage, pas encore décidées pour ce patient, et pas déjà
 * confirmées pour un autre patient (ni proposées à deux patients à la fois).
 * Ne lève jamais d'erreur (le suivi passe avant).
 */
export async function lierAutomatiquement(tenantId, resultats) {
  try {
    const propositions = [];
    for (const { patientId, recherche, liens } of resultats) {
      if (recherche.confiance !== 'sure') continue;
      const deja = new Set([...(liens?.confirmes || []), ...(liens?.ecartes || [])]);
      for (const f of recherche.fiches) {
        if (deja.has(f.id) || !f.raisons?.some((r) => r === 'matricule' || r === 'compte Sage')) continue;
        propositions.push({ patientId, f });
      }
    }
    if (!propositions.length) return 0;
    const ailleurs = await PhpPatientDme.findAll({
      where: { tenantId, statut: 'confirme', dmePatientId: { [Op.in]: [...new Set(propositions.map((p) => p.f.id))] } },
      attributes: ['patientId', 'dmePatientId'],
    });
    const prise = new Map(ailleurs.map((a) => [a.dmePatientId, a.patientId]));
    // Même fiche proposée à deux patients PHP : on ne choisit pas
    const candidats = new Map();
    for (const { patientId, f } of propositions) candidats.set(f.id, new Set([...(candidats.get(f.id) || []), patientId]));
    const vus = new Set();
    const rows = propositions
      .filter(({ patientId, f }) => (prise.has(f.id) ? prise.get(f.id) === patientId : candidats.get(f.id).size === 1))
      .filter(({ patientId, f }) => { const k = `${patientId}:${f.id}`; if (vus.has(k)) return false; vus.add(k); return true; })
      .map(({ patientId, f }) => ({ tenantId, patientId, dmePatientId: f.id, dossierNumero: f.dossier_numero || null, dmeNom: nomFiche(f), statut: 'confirme', source: 'auto' }));
    if (rows.length) await PhpPatientDme.bulkCreate(rows, { ignoreDuplicates: true });
    return rows.length;
  } catch (err) {
    console.error('Liens DME automatiques :', err.message);
    return 0;
  }
}

async function ouvrirDme(tenantId) {
  if (!(await isModuleActive(tenantId, 'dme'))) throw httpError(403, 'Module « Liaison DME » non activé.');
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'dme' } });
  if (!row?.secretEncrypted || !row.config?.host || row.enabled === false) throw httpError(409, 'Connexion au DME non réglée (Paramètres › Intégrations › DME).');
  return openDme(row.config, decryptSecret(row.secretEncrypted));
}

/** Fiche du DME par id ou n° de dossier (insensible aux espaces et à la casse). */
async function ficheDme(tenantId, { dmePatientId, dossier }) {
  const conn = await ouvrirDme(tenantId);
  try {
    const cols = 'id, dossier_numero, nom, prenom, date_naissance, type_client, matricule_agent';
    if (Number.isInteger(dmePatientId) && dmePatientId > 0) {
      const [[f]] = await conn.query(`SELECT ${cols} FROM patients WHERE id = ?`, [dmePatientId]);
      return f || null;
    }
    const d = String(dossier || '').replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9-]{3,50}$/.test(d)) throw httpError(400, 'N° de dossier DME invalide.');
    const [[f]] = await conn.query(`SELECT ${cols} FROM patients WHERE UPPER(REPLACE(dossier_numero, ' ', '')) = ? LIMIT 1`, [d]);
    return f || null;
  } finally {
    await conn.end().catch(() => {});
  }
}

/**
 * Décision à la main sur une fiche DME : statut confirme | ecarte.
 * body : { dmePatientId } ou { dossier } (n° saisi).
 */
export async function deciderLien(req, patientId, { dmePatientId, dossier, statut }) {
  if (!['confirme', 'ecarte'].includes(statut)) throw httpError(400, 'Statut invalide.');
  const patient = await PatientPHP.findOne({ where: { id: patientId, tenantId: req.tenantId }, attributes: ['id'] });
  if (!patient) throw httpError(404, 'Patient introuvable.');
  const f = await ficheDme(req.tenantId, { dmePatientId: dmePatientId != null ? Number(dmePatientId) : null, dossier });
  if (!f) throw httpError(404, dossier ? `Aucune fiche du DME avec le n° de dossier ${String(dossier).trim()}.` : 'Fiche du DME introuvable.');
  if (statut === 'confirme') {
    const autre = await PhpPatientDme.findOne({
      where: { tenantId: req.tenantId, dmePatientId: f.id, statut: 'confirme', patientId: { [Op.ne]: patientId } },
      include: [{ model: PatientPHP, as: 'patient', attributes: ['nom', 'prenom', 'matricule'] }],
    });
    if (autre) throw httpError(409, `Cette fiche du DME est déjà liée à ${[autre.patient?.nom, autre.patient?.prenom].filter(Boolean).join(' ')} (matricule ${autre.patient?.matricule}). Écartez-la d'abord chez ce patient.`);
  }
  const fields = { statut, source: 'manuel', dossierNumero: f.dossier_numero || null, dmeNom: nomFiche(f), decidedBy: req.user.id, decidedByName: userName(req.user) };
  const existing = await PhpPatientDme.findOne({ where: { patientId, dmePatientId: f.id } });
  if (existing) await existing.update(fields);
  else await PhpPatientDme.create({ ...fields, tenantId: req.tenantId, patientId, dmePatientId: f.id });
  return { dmePatientId: f.id, dossier: f.dossier_numero, nom: nomFiche(f), statut };
}

/** Annule une décision : la fiche redevient « proposée » par la recherche. */
export async function annulerLien(req, patientId, dmePatientId) {
  const n = await PhpPatientDme.destroy({ where: { tenantId: req.tenantId, patientId, dmePatientId: Number(dmePatientId) } });
  if (!n) throw httpError(404, 'Aucune décision à annuler.');
}

/** Liens d'un patient (fiche PHP). */
export async function liensDuPatient(tenantId, patientId) {
  const rows = await PhpPatientDme.findAll({ where: { tenantId, patientId }, order: [['statut', 'ASC'], ['updatedAt', 'DESC']] });
  return rows.map((r) => ({ dmePatientId: r.dmePatientId, dossier: r.dossierNumero, nom: r.dmeNom, statut: r.statut, source: r.source, decidedByName: r.decidedByName, updatedAt: r.updatedAt }));
}

/** Patients PHP dont un n° de dossier DME confirmé contient `texte`. */
export async function patientsParDossier(tenantId, texte) {
  const t = String(texte || '').replace(/\s+/g, '');
  if (t.length < 4) return [];
  const rows = await PhpPatientDme.findAll({ where: { tenantId, statut: 'confirme', dossierNumero: { [Op.iLike]: `%${t}%` } }, attributes: ['patientId'], limit: 200 });
  return [...new Set(rows.map((r) => r.patientId))];
}

// ── Rapprochement en masse (Module PHP › Patients) ─────────────────────────

async function rechercherPatients(tenantId, patients, conn) {
  const index = await indexDuTenant(tenantId, conn);
  const ids = patients.map((p) => p.id);
  const [liens, comptes] = await Promise.all([
    chargerLiens(tenantId, ids),
    PhpPatientCompteSage.findAll({ where: { tenantId, patientId: { [Op.in]: ids }, statut: 'confirme' }, attributes: ['patientId', 'compteTiers'] }),
  ]);
  const comptesDe = new Map();
  for (const c of comptes) comptesDe.set(c.patientId, [...(comptesDe.get(c.patientId) || []), c.compteTiers]);
  return patients.map((p) => ({
    patientId: p.id,
    liens: liens.get(p.id),
    recherche: rechercherDansDme({ matricule: p.matricule, nom: p.nom, prenom: p.prenom, comptes: comptesDe.get(p.id) || [], liens: liens.get(p.id) }, index),
  }));
}

/**
 * Recherche tous les patients PHP dans le DME et enregistre les liens sûrs.
 * → { total, lies (avec un lien confirmé après coup), nouveaux, aVerifier, ambigus, introuvables }
 */
const dernierRapprochement = new Map();
export async function rapprocherTousLesPatients(tenantId, { siPlusVieuxQue = 0 } = {}) {
  const last = dernierRapprochement.get(tenantId);
  if (siPlusVieuxQue && last && Date.now() - last < siPlusVieuxQue) return null;
  const raison = await dmeIndisponible(tenantId);
  if (raison) return { disponible: false, raison };
  dernierRapprochement.set(tenantId, Date.now());
  const patients = await PatientPHP.findAll({ where: { tenantId }, attributes: ['id', 'matricule', 'nom', 'prenom'] });
  const conn = await ouvrirDmeTenant(tenantId);
  let resultats;
  try { resultats = await rechercherPatients(tenantId, patients, conn); } finally { await conn.end().catch(() => {}); }
  const nouveaux = await lierAutomatiquement(tenantId, resultats);
  const lies = await PhpPatientDme.count({ where: { tenantId, statut: 'confirme' }, distinct: true, col: 'patientId' });
  const n = (f) => resultats.filter(f).length;
  return {
    disponible: true,
    total: patients.length,
    lies,
    nouveaux,
    aVerifier: n((r) => r.recherche.confiance === 'probable' && !r.liens?.confirmes.length),
    ambigus: n((r) => r.recherche.confiance === 'ambigu'),
    introuvables: n((r) => !r.recherche.fiches.length),
  };
}

/** Recherche d'un patient (fiche PHP) : fiches proposées, décisions, fiches écartées. */
export async function rechercheDuPatient(tenantId, patientId) {
  const raison = await dmeIndisponible(tenantId);
  if (raison) return { disponible: false, raison };
  const patient = await PatientPHP.findOne({ where: { id: patientId, tenantId }, attributes: ['id', 'matricule', 'nom', 'prenom'] });
  if (!patient) throw httpError(404, 'Patient introuvable.');
  const conn = await ouvrirDmeTenant(tenantId);
  let r;
  try { [r] = await rechercherPatients(tenantId, [patient], conn); } finally { await conn.end().catch(() => {}); }
  if (await lierAutomatiquement(tenantId, [r])) r.liens = (await chargerLiens(tenantId, [patient.id])).get(patient.id);
  const decision = new Map((r.liens?.rows || []).map((x) => [x.dmePatientId, x]));
  const { recherche } = r;
  return {
    disponible: true,
    patientId: patient.id,
    trouve: recherche.fiches.length > 0,
    confiance: recherche.confiance,
    doublons: recherche.doublons,
    ecartMatricule: recherche.ecartMatricule,
    fiches: recherche.fiches.map((f) => ({ ...resumeFiche(f), lien: decision.get(f.id)?.statut || null, lienSource: decision.get(f.id)?.source || null })),
    ecartees: (r.liens?.rows || []).filter((x) => x.statut === 'ecarte').map((x) => ({ id: x.dmePatientId, dossier: x.dossierNumero, nom: x.dmeNom })),
  };
}

/** Simulation : liens confirmés + liens sûrs que le rapprochement créerait (rien n'est écrit). */
export async function liensSursEnMemoire(tenantId) {
  const patients = await PatientPHP.findAll({ where: { tenantId }, attributes: ['id', 'matricule', 'nom', 'prenom'] });
  const conn = await ouvrirDmeTenant(tenantId);
  let resultats;
  try { resultats = await rechercherPatients(tenantId, patients, conn); } finally { await conn.end().catch(() => {}); }
  const out = [];
  for (const r of resultats) {
    const confirmes = new Set(r.liens?.confirmes || []);
    for (const f of r.recherche.fiches) {
      const sur = confirmes.has(f.id) || (r.recherche.confiance === 'sure' && f.raisons.some((x) => x === 'matricule' || x === 'compte Sage'));
      if (sur) out.push({ patientId: r.patientId, dmePatientId: f.id, dossierNumero: f.dossier_numero || null });
    }
  }
  return out;
}
