// backend/src/routes/sageBl.js — BL PHP en attente de facturation (lecture Sage)
import express from 'express';
import { protect } from '../middleware/auth.js';
import { getSummary, getLines, getControl, getAccess, updateAccess, getFactures, getFacturePdf, getRelevePdf, createReleve } from '../controllers/sageBlController.js';

const router = express.Router();
router.get('/summary', protect, getSummary);
router.get('/lines', protect, getLines);
router.get('/controle', protect, getControl);
router.get('/access', protect, getAccess);
router.put('/access', protect, updateAccess);
router.get('/factures', protect, getFactures);
router.get('/factures/:piece/pdf', protect, getFacturePdf);
router.get('/releve/:date/pdf', protect, getRelevePdf);
router.post('/releve', protect, createReleve);
export default router;
