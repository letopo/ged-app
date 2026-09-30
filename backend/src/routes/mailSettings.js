// backend/src/routes/mailSettings.js — Paramètres › Messagerie du tenant courant.
// Le contrôleur vérifie en plus que l'administrateur y a été autorisé par le superadmin.
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getMailSettings, updateMailSettings, testMailSettings } from '../controllers/mailSettingsController.js';

const router = express.Router();

router.get('/mail-settings',       protect, authorize('admin'), getMailSettings);
router.put('/mail-settings',       protect, authorize('admin'), updateMailSettings);
router.post('/mail-settings/test', protect, authorize('admin'), testMailSettings);

export default router;
