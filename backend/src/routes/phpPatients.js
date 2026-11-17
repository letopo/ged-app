// backend/src/routes/phpPatients.js - Module PHP
import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
const { protect, authorize } = authMiddlewareObject;

import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  searchByMatricule,
  genererBon,
  getHistoriquePatient
} from '../controllers/phpPatientController.js';
import { requirePhpWrite } from '../utils/phpAccess.js';
import { getComptesSage, decideComptesSage, addCompteSage, resetCompteSage, getParcours } from '../controllers/phpComptesSageController.js';
import { deciderLien, annulerLien, liensDuPatient, rapprocherTousLesPatients, rechercheDuPatient } from '../utils/phpPatientDme.js';

const lienFail = (res, err) => {
  if (!err.status) console.error('Lien DME :', err);
  res.status(err.status || 502).json({ success: false, message: err.status ? err.message : (err.message || 'DME injoignable.') });
};

const router = express.Router();

// ── Patients ─────────────────────────────────
router.get('/', protect, getPatients);
// Rapprochement de tous les patients avec le DME (liens sûrs enregistrés)
router.post('/rapprochement-dme', protect, requirePhpWrite, async (req, res) => {
  try { res.json({ success: true, ...(await rapprocherTousLesPatients(req.tenantId)) }); } catch (err) { lienFail(res, err); }
});
router.get('/search/matricule/:matricule', protect, searchByMatricule);
router.get('/:id', protect, getPatientById);
router.get('/:id/historique', protect, getHistoriquePatient);
// Comptes tiers Sage de l'agent (propositions par matricule + décisions)
router.get('/:id/comptes-sage', protect, getComptesSage);
// Parcours hospitalier : Module PHP + DME + Sage (lecture seule)
router.get('/:id/parcours', protect, getParcours);
router.put('/:id/comptes-sage', protect, requirePhpWrite, decideComptesSage);
router.post('/:id/comptes-sage', protect, requirePhpWrite, addCompteSage);
router.delete('/:id/comptes-sage/:compte', protect, requirePhpWrite, resetCompteSage);
// Fiche(s) du DME liées au patient : liste, « c'est lui » / « ce n'est pas lui » / n° saisi, annulation
router.get('/:id/dme', protect, async (req, res) => {
  try { res.json({ success: true, liens: await liensDuPatient(req.tenantId, req.params.id) }); } catch (err) { lienFail(res, err); }
});
router.get('/:id/dme/recherche', protect, async (req, res) => {
  try { res.json({ success: true, ...(await rechercheDuPatient(req.tenantId, req.params.id)) }); } catch (err) { lienFail(res, err); }
});
router.post('/:id/dme', protect, requirePhpWrite, async (req, res) => {
  try { res.json({ success: true, lien: await deciderLien(req, req.params.id, req.body || {}) }); } catch (err) { lienFail(res, err); }
});
router.delete('/:id/dme/:dmePatientId', protect, requirePhpWrite, async (req, res) => {
  try { await annulerLien(req, req.params.id, req.params.dmePatientId); res.json({ success: true }); } catch (err) { lienFail(res, err); }
});

router.post('/',        protect, requirePhpWrite, createPatient);
router.put('/:id',     protect, requirePhpWrite, updatePatient);
router.delete('/:id',  protect, requirePhpWrite, deletePatient);

// ── Bons de prise en charge ───────────────────
router.post('/:id/bon', protect, requirePhpWrite, genererBon);

export default router;
