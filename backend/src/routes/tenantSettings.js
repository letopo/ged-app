// backend/src/routes/tenantSettings.js — Paramètres › Délais et session du tenant courant.
// Lecture : tout utilisateur connecté (l'interface en a besoin : seuil « en
// retard », déconnexion après inactivité, taille maximale des fichiers).
// Modification : administrateurs de l'organisation.
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { TenantSettings, AuditLog } from '../models/index.js';
import { TENANT_SETTINGS, getTenantSettings, invalidateTenantSettings } from '../utils/tenantSettings.js';

const router = express.Router();

router.get('/tenant-settings', protect, async (req, res) => {
  res.json({ success: true, settings: await getTenantSettings(req.tenantId), limits: TENANT_SETTINGS });
});

router.put('/tenant-settings', protect, authorize('admin'), async (req, res) => {
  try {
    const body = req.body || {};
    const values = {};
    const errors = [];
    for (const [key, { min, max, boolean }] of Object.entries(TENANT_SETTINGS)) {
      if (body[key] === undefined || body[key] === '') continue;
      if (boolean) {
        if (typeof body[key] !== 'boolean') errors.push({ key });
        else values[key] = body[key];
        continue;
      }
      const n = Number(body[key]);
      if (!Number.isInteger(n) || n < min || n > max) errors.push({ key, min, max });
      else values[key] = n;
    }
    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Valeur hors limites.', errors });
    }

    const before = await getTenantSettings(req.tenantId);
    const [row] = await TenantSettings.findOrCreate({ where: { tenantId: req.tenantId }, defaults: { ...before, tenantId: req.tenantId } });
    await row.update({ ...values, updatedBy: req.user.id });
    invalidateTenantSettings(req.tenantId);

    const changes = Object.fromEntries(Object.entries(values).filter(([k, v]) => before[k] !== v).map(([k, v]) => [k, { avant: before[k], après: v }]));
    if (Object.keys(changes).length) await AuditLog.log(req, 'TENANT_SETTINGS_UPDATED', 'tenant', req.tenantId, changes);

    res.json({ success: true, message: 'Réglages enregistrés.', settings: await getTenantSettings(req.tenantId), limits: TENANT_SETTINGS });
  } catch (error) {
    console.error('Réglages du tenant :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;
