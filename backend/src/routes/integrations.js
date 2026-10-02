// backend/src/routes/integrations.js — Paramètres › IA · OCR (ai) et › Intégrations (sage)
// du tenant courant. Le contrôleur vérifie en plus que l'administrateur y a été
// autorisé par le superadmin.
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getIntegration, updateIntegration, testIntegration, previewSage, syncSage, previewSageFacturePdf,
} from '../controllers/integrationController.js';

const router = express.Router();
const admin = [protect, authorize('admin')];

// Routes Sage spécifiques avant /:kind
router.post('/integrations/sage/preview', ...admin, previewSage);
router.post('/integrations/sage/sync',    ...admin, syncSage);
router.post('/integrations/sage/facture-pdf', ...admin, previewSageFacturePdf);
router.get('/integrations/:kind',         ...admin, getIntegration);
router.put('/integrations/:kind',         ...admin, updateIntegration);
router.post('/integrations/:kind/test',   ...admin, testIntegration);

export default router;
