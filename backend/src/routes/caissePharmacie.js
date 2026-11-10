// backend/src/routes/caissePharmacie.js — État de la caisse de vente pharmacie (lecture Sage)
import express from 'express';
import { protect } from '../middleware/auth.js';
import { getCaisse, getCaissePdf, createCaisse } from '../controllers/caissePharmacieController.js';

const router = express.Router();
router.get('/', protect, getCaisse);
router.get('/pdf', protect, getCaissePdf);
router.post('/', protect, createCaisse);
export default router;
