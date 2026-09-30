// backend/src/routes/auth.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import { register, login, getProfile, updateProfile, getReleaseNotesState, markReleaseNotesSeen } from '../controllers/authController.js';
import {
  setup2FA,
  enable2FA,
  disable2FA,
  verifyLogin2FA,
  get2FAStatus,
  sendEmail2FACode,
  enableEmail2FA,
  disableEmail2FA,
  resendLogin2FACode,
} from '../controllers/twoFactorController.js';
import { loginLimiter, twoFALimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/profile',  protect, getProfile);
router.put('/profile',  protect, updateProfile);
router.get('/release-notes',       protect, getReleaseNotesState);
router.post('/release-notes/seen', protect, markReleaseNotesSeen);

// ── 2FA ──────────────────────────────────────────────────────────────────────
router.post('/2fa/verify-login', twoFALimiter, verifyLogin2FA);   // étape 2 du login (sans protect)
router.get( '/2fa/status',  protect, get2FAStatus);
router.post('/2fa/setup',   protect, setup2FA);
router.post('/2fa/enable',  protect, enable2FA);
router.post('/2fa/disable', protect, disable2FA);
// 2FA par e-mail (code à 6 chiffres)
router.post('/2fa/email/send',    protect, twoFALimiter, sendEmail2FACode);
router.post('/2fa/email/enable',  protect, twoFALimiter, enableEmail2FA);
router.post('/2fa/email/disable', protect, twoFALimiter, disableEmail2FA);
router.post('/2fa/resend', twoFALimiter, resendLogin2FACode);   // étape 2 du login (sans protect)

export default router;