// backend/src/routes/tenantModules.js — Paramètres › Modules du tenant courant.
// Lecture : tout utilisateur connecté (les menus en dépendent) ; modification :
// administrateurs (et superadmin), dans la limite de la licence.
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getModules, updateModule } from '../controllers/tenantModulesController.js';

const router = express.Router();

router.get('/modules', protect, getModules);
router.put('/modules/:key', protect, authorize('admin'), updateModule);

export default router;
