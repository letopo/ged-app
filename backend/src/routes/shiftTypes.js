// backend/src/routes/shiftTypes.js

import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getShiftTypes,
  getShiftTypeById,
  createShiftType,
  updateShiftType
} from '../controllers/shiftTypeController.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

/**
 * @route   GET /api/shift-types
 * @desc    Obtenir tous les types de shifts
 * @query   isActive, isWorkDay
 * @access  Private
 */
router.get('/', getShiftTypes);

/**
 * @route   GET /api/shift-types/:id
 * @desc    Obtenir un type de shift par ID
 * @access  Private
 */
router.get('/:id', getShiftTypeById);

/**
 * @route   POST /api/shift-types
 * @desc    Créer un nouveau type de shift
 * @access  Private - Admin only
 */
router.post(
  '/',
  authorize('admin'),
  createShiftType
);

/**
 * @route   PUT /api/shift-types/:id
 * @desc    Mettre à jour un type de shift
 * @access  Private - Admin only
 */
router.put(
  '/:id',
  authorize('admin'),
  updateShiftType
);

export default router;