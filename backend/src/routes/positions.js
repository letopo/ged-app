// backend/src/routes/positions.js

import express from 'express';
import { protect } from '../middleware/auth.js'; // ✅ CORRECTION : protect au lieu de auth
import {
  getPositions,
  assignToPosition,
  unassignFromPosition,
  updatePositionStatus
} from '../controllers/positionController.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(protect); // ✅ CORRECTION : protect au lieu de auth

// GET /api/tickets/positions/:queueType - Récupérer les positions d'une file
router.get('/:queueType', getPositions);

// POST /api/tickets/positions/assign - S'assigner à une position
router.post('/assign', assignToPosition);

// DELETE /api/tickets/positions/:positionId - Se désassigner
router.delete('/:positionId', unassignFromPosition);

// PATCH /api/tickets/positions/:positionId/status - Mettre à jour le statut
router.patch('/:positionId/status', updatePositionStatus);

export default router;