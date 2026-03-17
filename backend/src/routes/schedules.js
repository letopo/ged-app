// backend/src/routes/schedules.js

import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createSchedule,
  getSchedules,
  getScheduleById,
  bulkUpsertAssignments,
  submitForValidation,
  validateSchedule,
  getScheduleChangesLog,
  deleteSchedule,
} from '../controllers/scheduleController.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

/**
 * @route   GET /api/schedules
 * @desc    Obtenir tous les plannings (avec filtres optionnels)
 * @query   scheduleType, month, year, status, departmentId
 * @access  Private
 */
router.get('/', getSchedules);

/**
 * @route   GET /api/schedules/:id
 * @desc    Obtenir un planning par ID avec toutes ses affectations
 * @access  Private
 */
router.get('/:id', getScheduleById);

/**
 * @route   GET /api/schedules/:id/changes-log
 * @desc    Obtenir l'historique des modifications d'un planning
 * @access  Private
 */
router.get('/:id/changes-log', getScheduleChangesLog);

/**
 * @route   POST /api/schedules
 * @desc    Créer un nouveau planning
 * @access  Private - Admin/Director
 */
router.post(
  '/',
  authorize('admin', 'director', 'dds', 'medical_chief'),
  createSchedule
);

/**
 * @route   POST /api/schedules/:scheduleId/assignments
 * @desc    Ajouter/Mettre à jour des affectations en masse
 * @access  Private - Admin/Director
 */
router.post(
  '/:scheduleId/assignments',
  authorize('admin', 'director', 'dds', 'medical_chief'),
  bulkUpsertAssignments
);

/**
 * @route   POST /api/schedules/:id/submit
 * @desc    Soumettre un planning pour validation
 * @access  Private - Creator
 */
router.post(
  '/:id/submit',
  authorize('admin', 'director', 'dds', 'medical_chief'),
  submitForValidation
);

/**
 * @route   POST /api/schedules/:id/validate
 * @desc    Valider ou rejeter un planning
 * @body    { action: 'approve' | 'reject', comments, rejectionReason }
 * @access  Private - DDS/Medical Chief/DG selon workflow
 */
router.post(
  '/:id/validate',
  authorize('admin', 'director', 'dds', 'medical_chief'),
  validateSchedule
);

/**
 * @route   DELETE /api/schedules/:id
 * @desc    Supprimer un planning (soft delete)
 * @access  Private - Admin/Director
 */
router.delete(
  '/:id',
  authorize('admin', 'director'),
  deleteSchedule
);

export default router;