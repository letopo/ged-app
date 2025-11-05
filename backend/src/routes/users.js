// backend/src/routes/users.js - VERSION COMPLÈTE
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
  getMyService  // ← AJOUTER CETTE LIGNE
} from '../controllers/userController.js';

const router = express.Router();

// Applique la protection par token JWT à toutes les routes
router.use(protect);

// ⚠️ IMPORTANT : Cette route DOIT être AVANT router.route('/:id')
// pour éviter que '/me/service' soit interprété comme '/:id'
router.get('/me/service', getMyService);

// Routes principales pour la gestion des utilisateurs
router.route('/')
  .get(getUsers)
  .post(authorize('admin'), createUser);

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