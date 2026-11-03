// backend/src/routes/phpPharmacie.js - Module PHP : registre de pharmacie
import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
const { protect } = authMiddlewareObject;

import {
  listLignes, getStats, listProduits, listConsultationsDuJour,
  createLignes, updateLigne, deleteLigne,
} from '../controllers/phpPharmacieController.js';
import { requirePhpWrite } from '../utils/phpAccess.js';

const router = express.Router();

router.get('/',              protect, listLignes);
router.get('/stats',         protect, getStats);
router.get('/produits',      protect, listProduits);
router.get('/consultations', protect, listConsultationsDuJour);
router.post('/',             protect, requirePhpWrite, createLignes);
router.put('/:id',           protect, requirePhpWrite, updateLigne);
router.delete('/:id',        protect, requirePhpWrite, deleteLigne);

export default router;
