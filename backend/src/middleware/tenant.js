import { Op } from 'sequelize';
import { tenantNamespace } from '../config/database.js';

let Tenant = null;

// Chemins qui n'ont pas besoin de tenant (health + super-admin).
// Montée via `app.use('/api', resolveTenant)`, donc req.path est déjà relatif
// à ce préfixe (ex: '/health', pas '/api/health') — piège classique du
// mount-path Express, à ne pas réintroduire si ce middleware est un jour
// remonté ailleurs.
const EXCLUDED_PATHS = ['/health'];
const SUPER_ADMIN_PREFIX = '/super-admin';

export const resolveTenant = async (req, res, next) => {
  if (EXCLUDED_PATHS.includes(req.path)) return next();

  // Les routes super-admin sont accessibles depuis ged.hsjmcam.net
  // mais sans filtre tenant — elles gèrent elles-mêmes l'auth
  if (req.path.startsWith(SUPER_ADMIN_PREFIX)) {
    req.isSuperAdminRoute = true;
    return next();
  }

  if (!Tenant) {
    const models = await import('../models/index.js');
    Tenant = models.default.Tenant || models.Tenant;
  }

  const hostname = req.hostname;

  try {
    // Un tenant est identifié par sa `domain` principale, ou par un des
    // domaines/IP listés dans `additionalDomains` (ex: accès à la fois par
    // nom de domaine et par IP LAN directe pour un déploiement interne).
    let tenant = await Tenant.findOne({ where: { domain: hostname } });
    if (!tenant) {
      const candidates = await Tenant.findAll({ where: { additionalDomains: { [Op.ne]: null } } });
      tenant = candidates.find(t =>
        (t.additionalDomains || '').split(',').map(d => d.trim()).filter(Boolean).includes(hostname)
      ) || null;
    }

    if (!tenant) {
      return res.status(403).json({
        success: false,
        error: `Domaine non autorisé : ${hostname}`
      });
    }

    if (tenant.status === 'suspended') {
      return res.status(402).json({
        success: false,
        error: 'Ce compte est suspendu. Veuillez régulariser votre situation.',
        code: 'TENANT_SUSPENDED'
      });
    }

    if (tenant.status === 'cancelled') {
      return res.status(403).json({
        success: false,
        error: 'Ce compte a été résilié.',
        code: 'TENANT_CANCELLED'
      });
    }

    if (!tenant.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Ce compte est inactif.',
        code: 'TENANT_INACTIVE'
      });
    }

    req.tenant   = tenant;
    req.tenantId = tenant.id;

    tenantNamespace.run(() => {
      tenantNamespace.set('tenantId', tenant.id);
      next();
    });

  } catch (error) {
    next(error);
  }
};
