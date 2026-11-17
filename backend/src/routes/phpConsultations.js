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
import { suiviDme } from '../utils/phpSuiviDme.js';

const router = express.Router();

// ── Consultations ─────────────────────────────
router.get('/', protect, getConsultations);
router.post('/', protect, requirePhpWrite, createConsultation);
router.put('/:id/cloturer', protect, requirePhpWrite, cloturerConsultation);

// ── Suivi DME : où en est chaque patient de la page (étape + frise du jour) ──
router.get('/suivi-dme', protect, async (req, res) => {
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : null;
    if (!date) return res.status(400).json({ success: false, message: 'Date attendue (AAAA-MM-JJ).' });
    const ids = String(req.query.ids || '').split(',').map((s) => s.trim()).filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, 200);
    res.json({ success: true, ...(await suiviDme({ tenantId: req.tenantId, date, consultationIds: ids })) });
  } catch (err) {
    console.error('suivi-dme', err);
    res.status(500).json({ success: false, message: 'Suivi DME indisponible.' });
  }
});

// ── Hospitalisations ──────────────────────────
router.get('/hospitalisations/en-cours', protect, getHospitalisationsEnCours);
router.put('/hospitalisations/:id/cloturer', protect, requirePhpWrite, cloturerHospitalisation);

// ── Repos Maladie ─────────────────────────────
router.get('/repos/en-cours', protect, getReposEnCours);
router.put('/repos/:id/prolonger', protect, requirePhpWrite, prolongerRepos);

export default router;
