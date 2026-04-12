// backend/src/routes/phpReference.js - Module PHP
import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
const { protect, authorize } = authMiddlewareObject;

import {
  getInfirmeries,
  getInfirmerieById,
  createInfirmerie,
  updateInfirmerie,
  getSecteurs,
  createSecteur,
  updateSecteur,
  getServicesMedicaux
} from '../controllers/phpReferenceController.js';

const router = express.Router();

// ── Infirmeries ──────────────────────────────
router.get('/infirmeries', protect, getInfirmeries);
router.get('/infirmeries/:id', protect, getInfirmerieById);
router.post('/infirmeries', protect, authorize('admin', 'agent_accueil_php'), createInfirmerie);
router.put('/infirmeries/:id', protect, authorize('admin'), updateInfirmerie);

// ── Secteurs ─────────────────────────────────
router.get('/secteurs', protect, getSecteurs);
router.post('/secteurs', protect, authorize('admin', 'agent_accueil_php'), createSecteur);
router.put('/secteurs/:id', protect, authorize('admin'), updateSecteur);

// ── Services Médicaux ─────────────────────────
router.get('/services-medicaux', protect, getServicesMedicaux);

export default router;
