// backend/src/routes/notificationPreferenceRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import { getMyPreferences, updateMyPreferences } from '../controllers/notificationPreferenceController.js';

const router = express.Router();

router.get('/me', protect, getMyPreferences);
router.put('/me', protect, updateMyPreferences);

export default router;
