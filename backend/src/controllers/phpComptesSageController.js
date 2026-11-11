// backend/src/controllers/phpComptesSageController.js
// Module PHP › Patients › « Comptes tiers Sage » (étape A, 11/11/2026).
// Lecture : tout le module PHP ; décisions : saisie PHP (requirePhpWrite).
import { Op } from 'sequelize';
import { PatientPHP, PhpPatientCompteSage } from '../models/index.js';
import { loadPhpTiers, comptesDuPatient, findPhpTiers, normCompteTiers } from '../utils/phpSageComptes.js';

const userName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || null;
const fail = (res, err) => {
  console.error('Comptes Sage PHP :', err);
  res.status(err.status || 502).json({ success: false, message: err.status ? err.message : (err.message || 'Sage injoignable.') });
};

// Comptes confirmés pour un AUTRE patient (un compte n'appartient qu'à un agent)
async function confirmedElsewhere(patientId, comptes) {
  if (!comptes.length) return new Map();
  const rows = await PhpPatientCompteSage.findAll({
    where: { compteTiers: comptes, statut: 'confirme', patientId: { [Op.ne]: patientId } },
    include: [{ model: PatientPHP, as: 'patient', attributes: ['id', 'nom', 'prenom', 'matricule'] }],
  });
  return new Map(rows.map((r) => [normCompteTiers(r.compteTiers), r.patient ? { id: r.patient.id, nom: `${r.patient.nom} ${r.patient.prenom || ''}`.trim(), matricule: r.patient.matricule } : null]));
}

async function payload(req, patient, refresh = false) {
  const [tiers, decisions] = await Promise.all([
    loadPhpTiers(req.tenantId, { refresh }),
    PhpPatientCompteSage.findAll({ where: { patientId: patient.id } }),
  ]);
  const { employe, famille } = comptesDuPatient(patient.matricule, tiers, decisions);
  const ailleurs = await confirmedElsewhere(patient.id, [...employe, ...famille].map((c) => c.compte));
  const mark = (c) => ({ ...c, confirmeAilleurs: ailleurs.get(normCompteTiers(c.compte)) || null });
  return { success: true, matricule: patient.matricule, employe: employe.map(mark), famille: famille.map(mark) };
}

async function loadPatient(req, res) {
  const patient = await PatientPHP.findByPk(req.params.id, { attributes: ['id', 'matricule', 'nom', 'prenom'] });
  if (!patient) res.status(404).json({ success: false, message: 'Patient introuvable.' });
  return patient;
}

// GET /api/php/patients/:id/comptes-sage
export const getComptesSage = async (req, res) => {
  try {
    const patient = await loadPatient(req, res); if (!patient) return;
    res.json(await payload(req, patient, req.query.refresh === '1'));
  } catch (err) { fail(res, err); }
};

async function decide(req, patient, compte, statut, source) {
  const k = normCompteTiers(compte);
  if (statut === 'confirme') {
    const other = (await confirmedElsewhere(patient.id, [k])).get(k);
    if (other) { const e = new Error(`Ce compte est déjà confirmé pour ${other.nom} (matricule ${other.matricule}).`); e.status = 409; throw e; }
  }
  const existing = await PhpPatientCompteSage.findOne({ where: { patientId: patient.id, compteTiers: k } });
  const fields = { statut, decidedBy: req.user.id, decidedByName: userName(req.user) };
  if (existing) await existing.update(fields);
  else await PhpPatientCompteSage.create({ ...fields, tenantId: req.tenantId, patientId: patient.id, compteTiers: k, source });
}

// PUT /api/php/patients/:id/comptes-sage { comptes: [..], statut: confirme|ecarte }
export const decideComptesSage = async (req, res) => {
  try {
    const patient = await loadPatient(req, res); if (!patient) return;
    const { statut } = req.body || {};
    const comptes = (Array.isArray(req.body?.comptes) ? req.body.comptes : []).map(normCompteTiers).filter((c) => /^[A-Z0-9]{1,17}$/.test(c));
    if (!['confirme', 'ecarte'].includes(statut) || !comptes.length || comptes.length > 50) {
      return res.status(400).json({ success: false, message: 'Paramètres invalides.' });
    }
    for (const c of comptes) await decide(req, patient, c, statut, 'auto');
    res.json(await payload(req, patient));
  } catch (err) { fail(res, err); }
};

// POST /api/php/patients/:id/comptes-sage { compte } — ajout à la main
export const addCompteSage = async (req, res) => {
  try {
    const patient = await loadPatient(req, res); if (!patient) return;
    const compte = normCompteTiers(req.body?.compte);
    if (!/^[A-Z0-9]{1,17}$/.test(compte)) return res.status(400).json({ success: false, message: 'Numéro de compte tiers invalide.' });
    let tiers = await findPhpTiers(req.tenantId, compte);
    if (!tiers) { await loadPhpTiers(req.tenantId, { refresh: true }); tiers = await findPhpTiers(req.tenantId, compte); }
    if (!tiers) return res.status(404).json({ success: false, message: `Le compte ${compte} n'existe pas dans Sage parmi les comptes PHP (Employé ou Famille).` });
    await decide(req, patient, tiers.compte, 'confirme', 'manuel');
    res.json(await payload(req, patient));
  } catch (err) { fail(res, err); }
};

// DELETE /api/php/patients/:id/comptes-sage/:compte — annule la décision
// (le compte redevient « proposé », ou disparaît s'il avait été ajouté à la main)
export const resetCompteSage = async (req, res) => {
  try {
    const patient = await loadPatient(req, res); if (!patient) return;
    await PhpPatientCompteSage.destroy({ where: { patientId: patient.id, compteTiers: normCompteTiers(req.params.compte) } });
    res.json(await payload(req, patient));
  } catch (err) { fail(res, err); }
};
