// backend/src/routes/tickets.js

import express from 'express';
import {
  createTicket,
  getQueue,
  callNextPatient,
  startTreatment,
  transferToCaisse,
  completeTicket,
  cancelTicket,
  getQueuePositions,
  assignToPosition,
  unassignFromPosition,
  getStatistics
} from '../controllers/ticketController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// ROUTES PUBLIQUES (AUTHENTIFIÉES)
// ============================================

// Créer un ticket (Gardien)
router.post('/', protect, createTicket);

// Obtenir la file d'attente
router.get('/queue/:queueType', protect, getQueue);

// Obtenir les positions d'une file
router.get('/positions/:queueType', protect, getQueuePositions);

// Obtenir les statistiques
router.get('/statistics', protect, getStatistics);

// ============================================
// ROUTES AGENTS (ACCUEIL & CAISSE)
// ============================================

// S'assigner à une position
router.post('/positions/assign', protect, assignToPosition);

// Se désassigner d'une position
router.post('/positions/:positionId/unassign', protect, unassignFromPosition);

// Appeler le prochain patient
router.post('/call-next', protect, callNextPatient);

// Démarrer le traitement
router.post('/:ticketId/start', protect, startTreatment);

// Transférer à la caisse
router.post('/:ticketId/transfer-to-caisse', protect, transferToCaisse);

// Compléter un ticket (Caisse)
router.post('/:ticketId/complete', protect, completeTicket);

// Annuler un ticket
router.post('/:ticketId/cancel', protect, cancelTicket);

export default router;