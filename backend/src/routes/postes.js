// backend/src/routes/postes.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listPostes,
  assignHolder,
  removeHolder,
  listOrdreMissionTypes,
} from '../controllers/posteController.js';

const router = express.Router();

router.use(protect);

// Types d'ordre de mission (lecture pour tout utilisateur connecté : alimente le formulaire)
// ⚠️ avant toute route paramétrée pour éviter la collision avec /:code
router.get('/ordre-mission-types', listOrdreMissionTypes);

// Catalogue des postes + titulaires
router.get('/', listPostes);

// Gestion des titulaires — admin uniquement
router.post('/:code/holders', authorize('admin'), assignHolder);
router.delete('/:code/holders/:userId', authorize('admin'), removeHolder);

export default router;
