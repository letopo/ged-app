// backend/src/routes/workflow.js - VERSION COMPLÈTE
import express from 'express';
import { 
  createWorkflow, 
  getMyTasks, 
  validateTask, 
  getDocumentWorkflow,
  getValidators,
  bulkValidateTask  // ← AJOUTER
} from '../controllers/workflowController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Routes pour les workflows
router.post('/', protect, createWorkflow);
router.get('/my-tasks', protect, getMyTasks);
router.put('/:taskId/validate', protect, validateTask);
router.get('/document/:documentId', protect, getDocumentWorkflow);
router.get('/validators', protect, getValidators);

// ✅ NOUVEAU : Route pour validation en masse (directeur et admin uniquement)
router.post('/bulk-validate', protect, authorize('director', 'admin'), bulkValidateTask);

export default router;