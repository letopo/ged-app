// backend/src/routes/workflow.js - VERSION COMPLÈTE
import express from 'express';
import {
  createWorkflow,
  getMyTasks,
  validateTask,
  getDocumentWorkflow,
  getValidators,
  bulkValidateTask,
  reassignTask,
  getWorkflowComments,
  addWorkflowComment,
  relancerValidation,
  getOrdreMissionPreview,
} from '../controllers/workflowController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Routes pour les workflows
router.post('/', protect, createWorkflow);
router.get('/my-tasks', protect, getMyTasks);
router.put('/:taskId/validate', protect, validateTask);
router.get('/document/:documentId', protect, getDocumentWorkflow);
router.get('/document/:documentId/ordre-mission-preview', protect, getOrdreMissionPreview);
router.get('/validators', protect, getValidators);

// ✅ NOUVEAU : Route pour validation en masse (directeur et admin uniquement)
router.post('/bulk-validate', protect, authorize('director', 'admin'), bulkValidateTask);

// Réaffectation d'une tâche (admin uniquement)
router.put('/:taskId/reassign', protect, authorize('admin'), reassignTask);

// Discussion sur document rejeté
router.get('/document/:documentId/comments', protect, getWorkflowComments);
router.post('/document/:documentId/comments', protect, addWorkflowComment);

// Relancer la validation
router.post('/document/:documentId/relancer', protect, relancerValidation);

export default router;