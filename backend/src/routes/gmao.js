// backend/src/routes/gmao.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getEquipements, createEquipement, updateEquipement, deleteEquipement,
  getPlans, createPlan, updatePlan, deletePlan,
  getCalendar, getStats,
  getInterventions, getTodayInterventions, createIntervention,
  updateIntervention, deleteIntervention, completeIntervention,
  generatePreventiveInterventions,
  getAnalytics, getRapportEquipement,
} from '../controllers/gmaoController.js';
import {
  getContrats, createContrat, updateContrat, deleteContrat,
  getPieces, createPiece, updatePiece, deletePiece,
  getMouvements, createMouvement,
  getAcquisitions, createAcquisition, updateAcquisition, deleteAcquisition,
  getBudget, createBudgetLigne, deleteBudgetLigne,
  createBudgetDepense, deleteBudgetDepense, migrateBudget,
} from '../controllers/gmaoPhase4Controller.js';

const router = express.Router();

// Access check middleware - admins + specific emails
const GMAO_EMAILS = [
  'hsjm.cellulebiomedicale@gmail.com',
  'hsjm.pharma@gmail.com',
  'hopitalcameroun@ordredemaltefrance.org',
];

const gmaoAccess = (req, res, next) => {
  if (req.user.role === 'admin' || GMAO_EMAILS.includes(req.user.email)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Accès GMAO non autorisé' });
};

router.use(protect);
router.use(gmaoAccess);

// Équipements
router.get('/equipements', getEquipements);
router.post('/equipements', createEquipement);
router.put('/equipements/:id', updateEquipement);
router.delete('/equipements/:id', deleteEquipement);

// Plans maintenance
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Calendrier annuel
router.get('/calendar/:year', getCalendar);

// Stats
router.get('/stats', getStats);

// Analytics (Phase 3)
router.get('/analytics', getAnalytics);
router.get('/rapport/:equipementId', getRapportEquipement);

// Interventions (static routes BEFORE parametric :id routes)
router.get('/interventions/today', getTodayInterventions);
router.get('/interventions', getInterventions);
router.post('/interventions/generate', generatePreventiveInterventions);
router.post('/interventions', createIntervention);
router.patch('/interventions/:id/complete', completeIntervention);
router.put('/interventions/:id', updateIntervention);
router.delete('/interventions/:id', deleteIntervention);

// ─── PHASE 4 ROUTES ──────────────────────────────────────────────────────────

// Contrats
router.get('/contrats', getContrats);
router.post('/contrats', createContrat);
router.put('/contrats/:id', updateContrat);
router.delete('/contrats/:id', deleteContrat);

// Pièces de rechange
router.get('/pieces', getPieces);
router.post('/pieces', createPiece);
router.put('/pieces/:id', updatePiece);
router.delete('/pieces/:id', deletePiece);

// Mouvements de stock
router.get('/pieces/mouvements', getMouvements);
router.post('/pieces/mouvements', createMouvement);

// Acquisitions
router.get('/acquisitions', getAcquisitions);
router.post('/acquisitions', createAcquisition);
router.put('/acquisitions/:id', updateAcquisition);
router.delete('/acquisitions/:id', deleteAcquisition);

// Budget
router.get('/budget', getBudget);
router.post('/budget/lignes', createBudgetLigne);
router.delete('/budget/lignes/:id', deleteBudgetLigne);
router.post('/budget/depenses', createBudgetDepense);
router.delete('/budget/depenses/:id', deleteBudgetDepense);
router.post('/budget/migrate', migrateBudget);

export default router;
