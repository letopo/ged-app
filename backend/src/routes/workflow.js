// backend/src/routes/workflow.js - VERSION COMPLÈTE
import express from 'express';
import { 
  createWorkflow, 
  getMyTasks, 
  validateTask, 
  getDocumentWorkflow,
  getValidators 
} from '../controllers/workflowController.js';
import authMiddlewareObject from '../middleware/auth.js';

const router = express.Router();
const { protect } = authMiddlewareObject;

// Routes pour les workflows
router.post('/', protect, createWorkflow);
router.get('/my-tasks', protect, getMyTasks);
router.put('/:taskId/validate', protect, validateTask);
router.get('/document/:documentId', protect, getDocumentWorkflow);
router.get('/validators', protect, getValidators);

export default router;