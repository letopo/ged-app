// backend/src/routes/sageFactures.js — Supervision des factures patient PHP
// importées automatiquement depuis Sage (voir utils/sageFactureSync.js).
import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
import { list, exportPaiement } from '../controllers/sageFactureController.js';
import { canAccessSageBl } from '../controllers/sageBlController.js';

const { protect } = authMiddlewareObject;
const router = express.Router();

// Administrateurs + mêmes personnes que les BL PHP : poste « Finances » et
// postes autorisés par le superadmin (Facturation, DG, CCG par défaut).
// Même règle que l'entrée du menu (user.canSeeSageBl).
const canView = async (req, res, next) => {
  if (['admin', 'superadmin'].includes(req.user.role) || await canAccessSageBl(req.user, req.tenantId)) return next();
  return res.status(403).json({ success: false, message: 'Accès réservé (Factures PHP) : demandez le poste « Finances » à un administrateur.' });
};

router.get('/', protect, canView, list);
router.get('/export-paiement', protect, canView, exportPaiement);

export default router;
