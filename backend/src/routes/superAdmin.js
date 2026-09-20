import express from 'express';
import { requireSuperAdmin } from '../middleware/superadmin.js';
import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  setTenantStatus,
  deleteTenant,
  getStats
} from '../controllers/superAdminController.js';

const router = express.Router();

// Toutes ces routes requièrent le rôle superadmin
router.use(requireSuperAdmin);

router.get('/stats',           getStats);
router.get('/tenants',         listTenants);
router.get('/tenants/:id',     getTenant);
router.post('/tenants',        createTenant);
router.put('/tenants/:id',     updateTenant);
router.patch('/tenants/:id/status', setTenantStatus);
router.delete('/tenants/:id',  deleteTenant);

export default router;
