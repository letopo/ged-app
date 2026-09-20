// backend/src/routes/users.js - VERSION CORRIGÉE

import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import uploadSignatureMiddleware from '../middleware/uploadSignature.js';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  uploadSignature,
  uploadStamp,
  getMyService,
  getValidators,
  getUsersWithPostes,
} from '../controllers/userController.js';
import { toggleAbsence } from '../controllers/workflowController.js';

const router = express.Router();

// Applique la protection par token JWT à toutes les routes
router.use(protect);

// ⚠️ IMPORTANT : Les routes spécifiques DOIVENT être AVANT router.route('/:id')

// 1. Route Service personnel
router.get('/me/service', getMyService);

// 2. Route Validateurs
router.get('/validators', getValidators);

// 3. Route utilisateurs avec postes (pour la page droits d'accès)
router.get('/with-postes', authorize('admin'), getUsersWithPostes);

// Routes principales pour la gestion des utilisateurs
router.route('/')
  .get(getUsers)
  .post(authorize('admin'), createUser);

// Routes dynamiques par ID (doivent être en dernier pour les GET)
router.route('/:id')
  .get(authorize('admin'), getUserById)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);
  
router.post('/:id/reset-password', authorize('admin'), resetUserPassword);

// Statut présence/absence — soi-même ou un admin (vérifié dans le contrôleur).
router.put('/:id/absence', toggleAbsence);

// Routes pour upload d'images (signatures et cachets)
router.post(
  '/:id/signature',
  authorize('admin'),
  uploadSignatureMiddleware.single('signature'),
  uploadSignature
);

router.post(
  '/:id/stamp',
  authorize('admin'),
  uploadSignatureMiddleware.single('stamp'),
  uploadStamp
);

export default router;