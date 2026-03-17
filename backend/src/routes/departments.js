// backend/src/routes/departments.js

import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment
} from '../controllers/departmentController.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

/**
 * @route   GET /api/departments
 * @desc    Obtenir tous les départements
 * @query   type, isActive
 * @access  Private
 */
router.get('/', getDepartments);

/**
 * @route   GET /api/departments/:id
 * @desc    Obtenir un département par ID
 * @access  Private
 */
router.get('/:id', getDepartmentById);

/**
 * @route   POST /api/departments
 * @desc    Créer un nouveau département
 * @access  Private - Admin only
 */
router.post(
  '/',
  authorize('admin'),
  createDepartment
);

/**
 * @route   PUT /api/departments/:id
 * @desc    Mettre à jour un département
 * @access  Private - Admin only
 */
router.put(
  '/:id',
  authorize('admin'),
  updateDepartment
);

export default router;