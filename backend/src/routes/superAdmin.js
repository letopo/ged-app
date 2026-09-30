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
import { superGetMailSettings, superUpdateMailSettings, superTestMailSettings } from '../controllers/mailSettingsController.js';
import {
  superGetIntegration, superUpdateIntegration, superTestIntegration, superPreviewSage, superSyncSage,
} from '../controllers/integrationController.js';

const router = express.Router();

// Toutes ces routes requièrent le rôle superadmin
router.use(requireSuperAdmin);

router.get('/stats',           getStats);
router.get('/tenants',         listTenants);
router.get('/tenants/:id',     getTenant);
router.post('/tenants',        createTenant);
router.put('/tenants/:id',     updateTenant);
// Messagerie (SMTP) d'un tenant
router.get('/tenants/:id/mail-settings',       superGetMailSettings);
router.put('/tenants/:id/mail-settings',       superUpdateMailSettings);
router.post('/tenants/:id/mail-settings/test', superTestMailSettings);
// Intégrations (IA, Sage) d'un tenant
router.post('/tenants/:id/integrations/sage/preview', superPreviewSage);
router.post('/tenants/:id/integrations/sage/sync',    superSyncSage);
router.get('/tenants/:id/integrations/:kind',         superGetIntegration);
router.put('/tenants/:id/integrations/:kind',         superUpdateIntegration);
router.post('/tenants/:id/integrations/:kind/test',   superTestIntegration);
router.patch('/tenants/:id/status', setTenantStatus);
router.delete('/tenants/:id',  deleteTenant);

export default router;
