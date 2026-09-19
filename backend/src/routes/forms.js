// backend/src/routes/forms.js

import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
import {
  getForms,
  getFormById,
  createForm,
  updateForm,
  publishForm,
  unpublishForm,
  archiveForm,
  deleteForm,
  duplicateForm,
  getFormPermissions,
  setFormPermissions,
  submitResponse,
  getFormResponses,
  getResponseById,
  updateResponseStatus,
  getFormStats,
  approveStep,
  rejectStep,
  getPendingApprovals,
} from '../controllers/formController.js';

const router = express.Router();
const { protect } = authMiddlewareObject;

// ── Formulaires ───────────────────────────────────────────────────────────────
router.get('/',                    protect, getForms);
router.post('/',                   protect, createForm);
router.get('/:id',                 protect, getFormById);
router.put('/:id',                 protect, updateForm);
router.delete('/:id',              protect, deleteForm);
router.post('/:id/duplicate',      protect, duplicateForm);

// ── Changements de statut ─────────────────────────────────────────────────────
router.patch('/:id/publish',       protect, publishForm);
router.patch('/:id/unpublish',     protect, unpublishForm);
router.patch('/:id/archive',       protect, archiveForm);

// ── Permissions ───────────────────────────────────────────────────────────────
router.get('/:id/permissions',     protect, getFormPermissions);
router.put('/:id/permissions',     protect, setFormPermissions);

// ── Statistiques ─────────────────────────────────────────────────────────────
router.get('/:id/stats',           protect, getFormStats);

// ── Réponses ──────────────────────────────────────────────────────────────────
router.get('/responses/pending',               protect, getPendingApprovals);
router.post('/:id/responses',                  protect, submitResponse);
router.get('/:id/responses',                   protect, getFormResponses);
router.get('/:id/responses/:rid',              protect, getResponseById);
router.patch('/:id/responses/:rid/status',     protect, updateResponseStatus);
router.post('/:id/responses/:rid/approve',     protect, approveStep);
router.post('/:id/responses/:rid/reject',      protect, rejectStep);

export default router;
