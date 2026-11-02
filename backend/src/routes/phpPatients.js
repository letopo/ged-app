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

const router = express.Router();

// ── Patients ─────────────────────────────────
router.get('/', protect, getPatients);
router.get('/search/matricule/:matricule', protect, searchByMatricule);
router.get('/:id', protect, getPatientById);
router.get('/:id/historique', protect, getHistoriquePatient);

router.post('/',        protect, requirePhpWrite, createPatient);
router.put('/:id',     protect, requirePhpWrite, updatePatient);
router.delete('/:id',  protect, requirePhpWrite, deletePatient);

// ── Bons de prise en charge ───────────────────
router.post('/:id/bon', protect, requirePhpWrite, genererBon);

export default router;
