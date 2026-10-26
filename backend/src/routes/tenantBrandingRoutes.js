// backend/src/routes/tenantBrandingRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import uploadLogoMiddleware from '../middleware/uploadLogo.js';
import { getBranding, updateBranding, uploadLogo } from '../controllers/tenantBrandingController.js';

const router = express.Router();

router.get('/branding', protect, getBranding);
router.put('/branding', protect, updateBranding);
// Droits vérifiés AVANT multer : aucun fichier écrit pour un non-administrateur
router.post('/branding/logo', protect, authorize('admin'), uploadLogoMiddleware.single('logo'), uploadLogo);

export default router;
