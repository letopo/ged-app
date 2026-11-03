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
import { getTableauDuJour, getIndicateurs, getActiviteInfirmeries, listIndicateurs, saveIndicateurs } from '../controllers/phpIndicateursController.js';
import { requirePhpWrite } from '../utils/phpAccess.js';

const router = express.Router();

router.get('/dashboard',           protect, getDashboard);
router.get('/jour',                protect, getStatsDuJour);
router.get('/mensuelles',          protect, getStatsMensuelles);
router.get('/temps-attente',       protect, getStatsTempsAttente);
router.get('/rapport-mensuel',     protect, getRapportMensuel);
router.get('/rapport-trimestriel', protect, getRapportTrimestriel);
router.get('/pathologies',         protect, getPathologiesParInfirmerie);
// Tableaux de l'Excel du Point Focal : tableau du jour (Feuil8/10), indicateurs (Feuil1)
router.get('/tableau-jour',        protect, getTableauDuJour);
router.get('/indicateurs',         protect, getIndicateurs);
// Tableau PHP 2026 : activité des infirmeries, une feuille par mois
router.get('/activite',            protect, getActiviteInfirmeries);
// Mots-clés des indicateurs : lecture pour tous les postes PHP, modification à la saisie
router.get('/indicateurs/config',  protect, listIndicateurs);
router.put('/indicateurs/config',  protect, requirePhpWrite, saveIndicateurs);

export default router;
