import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createWorkflow,
  getMyTasks,
  getDocumentWorkflow,
  approveTask,
  rejectTask,
  getStats
} from '../controllers/workflowController.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);;

// 📋 Créer un workflow de validation
router.post('/', createWorkflow);

// 📥 Récupérer mes tâches de validation
router.get('/my-tasks', getMyTasks);

// 📊 Statistiques des workflows
router.get('/stats', getStats);

// 📄 Récupérer le workflow d'un document
router.get('/document/:documentId', getDocumentWorkflow);

// ✅ Approuver une tâche
router.put('/:id/approve', approveTask);

// ❌ Rejeter une tâche
router.put('/:id/reject', rejectTask);

export default router;
