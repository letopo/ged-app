import express from 'express';
import { activateLicense, getLicenseStatus } from '../controllers/licenseController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Seul un utilisateur connecté peut activer ou voir le statut
router.post('/activate', protect, activateLicense);
router.get('/status', protect, getLicenseStatus);

export default router;