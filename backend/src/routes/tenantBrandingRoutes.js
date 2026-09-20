// backend/src/routes/tenantBrandingRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import uploadLogoMiddleware from '../middleware/uploadLogo.js';
import { getBranding, updateBranding, uploadLogo } from '../controllers/tenantBrandingController.js';

const router = express.Router();

router.get('/branding', protect, getBranding);
router.put('/branding', protect, updateBranding);
router.post('/branding/logo', protect, uploadLogoMiddleware.single('logo'), uploadLogo);

export default router;
