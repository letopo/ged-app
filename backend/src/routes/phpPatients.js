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

const router = express.Router();

// ── Patients ─────────────────────────────────
router.get('/', protect, getPatients);
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

router.post('/',        protect, requirePhpWrite, createPatient);
router.put('/:id',     protect, requirePhpWrite, updatePatient);
router.delete('/:id',  protect, requirePhpWrite, deletePatient);

// ── Bons de prise en charge ───────────────────
router.post('/:id/bon', protect, requirePhpWrite, genererBon);

export default router;
