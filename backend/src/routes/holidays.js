// backend/src/routes/holidays.js

import express from 'express';
import { getHolidays, checkHoliday } from '../controllers/holidaysController.js';
import { protect } from '../middleware/auth.js'; // ✅ CORRIGÉ : utiliser 'protect'

const router = express.Router();

// Récupérer tous les jours fériés pour une année
router.get('/', protect, getHolidays);

// Vérifier si une date est un jour férié
router.get('/check', protect, checkHoliday);

export default router;