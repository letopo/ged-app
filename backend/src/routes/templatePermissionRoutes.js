// backend/src/routes/templatePermissionRoutes.js
import express from 'express';
import { getAll, getMyTemplates, upsert, update, seed, getUsers } from '../controllers/templatePermissionController.js';
import { protect, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Routes protégées (tous les utilisateurs authentifiés)
router.get('/my-templates', protect, getMyTemplates);

// Routes admin uniquement
router.get('/', protect, isAdmin, getAll);
router.post('/', protect, isAdmin, upsert);
router.put('/:id', protect, isAdmin, update);
router.post('/seed', protect, isAdmin, seed);
router.get('/users', protect, isAdmin, getUsers);

export default router;
