// backend/src/routes/sageBonsCommande.js — Bons de commande fournisseurs lus dans Sage → signature
import express from 'express';
import { protect } from '../middleware/auth.js';
import { listBc, getBc, getBcPdf, sendBc } from '../controllers/sageBonCommandeController.js';

const router = express.Router();
router.get('/', protect, listBc);
router.get('/:piece', protect, getBc);
router.get('/:piece/pdf', protect, getBcPdf);
router.post('/:piece', protect, sendBc);
export default router;
