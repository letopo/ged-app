// backend/src/routes/calendar.js - NOUVEAU FICHIER
import express from 'express';
import { protect } from '../middleware/auth.js';
import { getPermissions } from '../controllers/calendarController.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/calendar/permissions
// @desc    Récupérer toutes les permissions approuvées avec dates
// @access  Private
router.get('/permissions', getPermissions);

export default router;