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

const router = express.Router();

// ── Patients ─────────────────────────────────
router.get('/', protect, getPatients);
router.get('/search/matricule/:matricule', protect, searchByMatricule);
router.get('/:id', protect, getPatientById);
router.get('/:id/historique', protect, getHistoriquePatient);

router.post('/',        protect, authorize('admin', 'agent_accueil_php'), createPatient);
router.put('/:id',     protect, authorize('admin', 'agent_accueil_php'), updatePatient);
router.delete('/:id',  protect, authorize('admin', 'agent_accueil_php'), deletePatient);

// ── Bons de prise en charge ───────────────────
router.post('/:id/bon', protect, authorize('admin', 'agent_accueil_php'), genererBon);

export default router;
