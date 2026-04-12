// backend/src/routes/phpStats.js - Module PHP
import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
const { protect } = authMiddlewareObject;

import {
  getStatsDuJour,
  getStatsMensuelles,
  getStatsTempsAttente,
  getDashboard,
  getRapportMensuel,
  getRapportTrimestriel,
  getPathologiesParInfirmerie,
} from '../controllers/phpStatsController.js';

const router = express.Router();

router.get('/dashboard',           protect, getDashboard);
router.get('/jour',                protect, getStatsDuJour);
router.get('/mensuelles',          protect, getStatsMensuelles);
router.get('/temps-attente',       protect, getStatsTempsAttente);
router.get('/rapport-mensuel',     protect, getRapportMensuel);
router.get('/rapport-trimestriel', protect, getRapportTrimestriel);
router.get('/pathologies',         protect, getPathologiesParInfirmerie);

export default router;
