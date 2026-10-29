// backend/src/routes/bloc.js — Programme opératoire de la semaine (tous services)
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMyAccess, getServices, updateServices, getWeek,
  addIntervention, updateIntervention, deleteIntervention, setStatus,
} from '../controllers/blocController.js';

const router = express.Router();
router.use(protect);

router.get('/me', getMyAccess);
router.get('/services', getServices);
router.put('/services', updateServices);
router.get('/semaines/:weekStart', getWeek);
router.post('/semaines/:weekStart/interventions', addIntervention);
router.post('/semaines/:weekStart/statut', setStatus);
router.put('/interventions/:id', updateIntervention);
router.delete('/interventions/:id', deleteIntervention);

export default router;
