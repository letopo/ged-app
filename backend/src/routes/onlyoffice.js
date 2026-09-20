// backend/src/routes/onlyoffice.js

import express from 'express';
import { protect } from '../middleware/auth.js';
import { getOnlyOfficeConfig, onlyofficeCallback } from '../controllers/onlyofficeController.js';

const router = express.Router();

// GET /api/onlyoffice/config/:documentId
// Génère la config + token JWT pour l'éditeur
router.get('/config/:documentId', protect, getOnlyOfficeConfig);

// POST /api/onlyoffice/callback/:documentId
// Reçoit la sauvegarde depuis OnlyOffice (pas de protect — appelé par OnlyOffice server-to-server)
router.post('/callback/:documentId', onlyofficeCallback);

export default router;
