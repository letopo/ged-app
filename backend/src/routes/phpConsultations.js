// backend/src/routes/phpConsultations.js - Module PHP
import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
const { protect, authorize } = authMiddlewareObject;

import {
  getConsultations,
  createConsultation,
  cloturerConsultation,
  cloturerHospitalisation,
  prolongerRepos,
  getReposEnCours,
  getHospitalisationsEnCours
} from '../controllers/phpConsultationController.js';
import { requirePhpWrite } from '../utils/phpAccess.js';

const router = express.Router();

// ── Consultations ─────────────────────────────
router.get('/', protect, getConsultations);
router.post('/', protect, requirePhpWrite, createConsultation);
router.put('/:id/cloturer', protect, requirePhpWrite, cloturerConsultation);

// ── Hospitalisations ──────────────────────────
router.get('/hospitalisations/en-cours', protect, getHospitalisationsEnCours);
router.put('/hospitalisations/:id/cloturer', protect, requirePhpWrite, cloturerHospitalisation);

// ── Repos Maladie ─────────────────────────────
router.get('/repos/en-cours', protect, getReposEnCours);
router.put('/repos/:id/prolonger', protect, requirePhpWrite, prolongerRepos);

export default router;
