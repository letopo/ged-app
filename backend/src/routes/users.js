// backend/src/routes/users.js - VERSION COMPLÈTE
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import uploadSignatureMiddleware from '../middleware/uploadSignature.js'; // NOUVEL IMPORT
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  uploadSignature, // NOUVEL IMPORT
  uploadStamp      // NOUVEL IMPORT
} from '../controllers/userController.js';

const router = express.Router();

// Applique la protection par token JWT à toutes les routes de ce fichier
router.use(protect);

// Routes principales pour la gestion des utilisateurs (réservées aux admins)
router.route('/')
  .get(getUsers)
  .post(authorize('admin'), createUser);

router.route('/:id')
  .get(authorize('admin'), getUserById)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);
  
router.post('/:id/reset-password', authorize('admin'), resetUserPassword);


// ==============================================
// === NOUVELLES ROUTES POUR UPLOAD D'IMAGES ===
// ==============================================

// Route pour uploader une signature.
// 1. 'authorize' vérifie si l'utilisateur est admin.
// 2. 'uploadSignatureMiddleware.single('signature')' intercepte le fichier nommé 'signature' dans la requête.
// 3. 'uploadSignature' (du contrôleur) gère la logique après l'upload.
router.post(
  '/:id/signature',
  authorize('admin'),
  uploadSignatureMiddleware.single('signature'),
  uploadSignature
);

// Route pour uploader un cachet.
router.post(
  '/:id/stamp',
  authorize('admin'),
  uploadSignatureMiddleware.single('stamp'),
  uploadStamp
);

export default router;