// backend/src/routes/phpFactures.js — Module factures PHP (secrétaire)
import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  extractFromUpload, reextract, create, list, getOne, update, remove, exportCsv,
} from '../controllers/phpFactureController.js';

const { protect, authorize } = authMiddlewareObject;
const router = express.Router();

// Réservé à la secrétaire/agent PHP et aux admins
// (on couvre les deux casses du rôle présentes dans le code historique)
const canManage = authorize('admin', 'agent_accueil_php', 'agent_accueil_PHP');

router.get('/', protect, list);
router.get('/export.csv', protect, exportCsv);
router.get('/:id', protect, getOne);

router.post('/extract', protect, canManage, upload.single('file'), extractFromUpload);
router.post('/:documentId/reextract', protect, canManage, reextract);
router.post('/', protect, canManage, create);
router.put('/:id', protect, canManage, update);
router.delete('/:id', protect, canManage, remove);

export default router;
