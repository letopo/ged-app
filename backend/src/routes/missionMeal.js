// backend/src/routes/missionMeal.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMealRates,
  upsertMealRate,
  deleteMealRate,
  updateMealThresholds,
  calculateMissionMeals,
} from '../controllers/missionMealController.js';

const router = express.Router();

router.use(protect);

// Lecture ouverte à tout utilisateur connecté (alimente l'aperçu de calcul sur l'OM).
router.get('/', getMealRates);
router.post('/calculate', calculateMissionMeals);

// Écriture réservée à la comptabilité / DG / admin (vérifié dans le contrôleur).
router.post('/rates', upsertMealRate);
router.delete('/rates/:id', deleteMealRate);
router.put('/thresholds', updateMealThresholds);

export default router;
