// backend/src/routes/sageFactures.js — Supervision des factures patient PHP
// importées automatiquement depuis Sage (voir utils/sageFactureSync.js).
import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
import { list, exportPaiement } from '../controllers/sageFactureController.js';

const { protect, authorize } = authMiddlewareObject;
const router = express.Router();

// Réservé à la facturation/CCG/admin — à affiner une fois les rôles dédiés confirmés
const canView = authorize('admin', 'superadmin');

router.get('/', protect, canView, list);
router.get('/export-paiement', protect, canView, exportPaiement);

export default router;
