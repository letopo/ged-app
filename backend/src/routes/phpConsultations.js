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

const router = express.Router();

// ── Consultations ─────────────────────────────
router.get('/', protect, getConsultations);
router.post('/', protect, authorize('admin', 'agent_accueil_php'), createConsultation);
router.put('/:id/cloturer', protect, authorize('admin', 'agent_accueil_php'), cloturerConsultation);

// ── Hospitalisations ──────────────────────────
router.get('/hospitalisations/en-cours', protect, getHospitalisationsEnCours);
router.put('/hospitalisations/:id/cloturer', protect, authorize('admin', 'agent_accueil_php'), cloturerHospitalisation);

// ── Repos Maladie ─────────────────────────────
router.get('/repos/en-cours', protect, getReposEnCours);
router.put('/repos/:id/prolonger', protect, authorize('admin', 'agent_accueil_php'), prolongerRepos);

export default router;
