// backend/src/routes/integrations.js — Paramètres › IA · OCR (ai) et › Intégrations (sage)
// du tenant courant. Le contrôleur vérifie en plus que l'administrateur y a été
// autorisé par le superadmin.
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { requireModule } from '../middleware/requireModule.js';
import {
  getIntegration, updateIntegration, testIntegration, previewSage, syncSage, previewSageFacturePdf,
} from '../controllers/integrationController.js';

const router = express.Router();
const admin = [protect, authorize('admin')];
// Réglages d'une intégration : son module doit être actif (ai → IA, dme → DME, sage → Sage)
const KIND_MODULES = { ai: requireModule('ia'), dme: requireModule('dme'), sage: requireModule('sage') };
const kindModule = (req, res, next) => (KIND_MODULES[req.params.kind] || ((r, s, n) => n()))(req, res, next);
const sageModule = KIND_MODULES.sage;

// Routes Sage spécifiques avant /:kind
router.post('/integrations/sage/preview', ...admin, sageModule, previewSage);
router.post('/integrations/sage/sync',    ...admin, sageModule, syncSage);
router.post('/integrations/sage/facture-pdf', ...admin, sageModule, previewSageFacturePdf);
router.get('/integrations/:kind',         ...admin, kindModule, getIntegration);
router.put('/integrations/:kind',         ...admin, kindModule, updateIntegration);
router.post('/integrations/:kind/test',   ...admin, kindModule, testIntegration);

export default router;
