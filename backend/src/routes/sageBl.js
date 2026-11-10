// backend/src/routes/sageBl.js — BL PHP en attente de facturation (lecture Sage)
import express from 'express';
import { protect } from '../middleware/auth.js';
import { listPreparations, createPreparation, checkPreparations, sendToSignature, cancelPreparation } from '../controllers/sagePreparationController.js';
import { getSummary, getLines, getBpcFactures, getControl, getAccess, updateAccess, getFactures, getFacturePdf, getRelevePdf, createReleve } from '../controllers/sageBlController.js';

const router = express.Router();
router.get('/summary', protect, getSummary);
router.get('/lines', protect, getLines);
router.get('/bpc-factures', protect, getBpcFactures);
router.get('/controle', protect, getControl);
router.get('/access', protect, getAccess);
router.put('/access', protect, updateAccess);
router.get('/factures', protect, getFactures);
router.get('/factures/:piece/pdf', protect, getFacturePdf);
router.get('/releve/:date/pdf', protect, getRelevePdf);
router.post('/releve', protect, createReleve);
// Facturation assistée d'un BPC (la GED n'écrit jamais dans Sage)
router.get('/preparations', protect, listPreparations);
router.post('/preparations', protect, createPreparation);
router.post('/preparations/verifier', protect, checkPreparations);
router.post('/preparations/:id/signature', protect, sendToSignature);
router.post('/preparations/:id/annuler', protect, cancelPreparation);
export default router;
