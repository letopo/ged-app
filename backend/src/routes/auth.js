// backend/src/routes/auth.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';
import {
  setup2FA,
  enable2FA,
  disable2FA,
  verifyLogin2FA,
  get2FAStatus
} from '../controllers/twoFactorController.js';
import { loginLimiter, twoFALimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/profile',  protect, getProfile);
router.put('/profile',  protect, updateProfile);

// ── 2FA ──────────────────────────────────────────────────────────────────────
router.post('/2fa/verify-login', twoFALimiter, verifyLogin2FA);   // étape 2 du login (sans protect)
router.get( '/2fa/status',  protect, get2FAStatus);
router.post('/2fa/setup',   protect, setup2FA);
router.post('/2fa/enable',  protect, enable2FA);
router.post('/2fa/disable', protect, disable2FA);

export default router;