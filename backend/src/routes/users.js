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
  getValidators // ✅ 1. AJOUTER L'IMPORT ICI
} from '../controllers/userController.js';

const router = express.Router();

// Applique la protection par token JWT à toutes les routes
router.use(protect);

// ⚠️ IMPORTANT : Les routes spécifiques DOIVENT être AVANT router.route('/:id')

// 1. Route Service personnel
router.get('/me/service', getMyService);

// 2. Route Validateurs (✅ AJOUTER CETTE ROUTE ICI)
// Accessible à tous les utilisateurs connectés pour pouvoir soumettre des docs
router.get('/validators', getValidators);

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