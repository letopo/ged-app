// backend/src/routes/sageBl.js — BL PHP en attente de facturation (lecture Sage)
import express from 'express';
import { protect } from '../middleware/auth.js';
import { getSummary, getLines, getControl, getAccess, updateAccess } from '../controllers/sageBlController.js';

const router = express.Router();
router.get('/summary', protect, getSummary);
router.get('/lines', protect, getLines);
router.get('/controle', protect, getControl);
router.get('/access', protect, getAccess);
router.put('/access', protect, updateAccess);
export default router;
