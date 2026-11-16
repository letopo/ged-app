// backend/src/controllers/tenantModulesController.js — Paramètres › Modules
// (tenant courant) et Clients SaaS › Modules (superadmin, tenant précis).
//
// Règles (décidées le 16/11/2026) :
//   - le super-administrateur peut tout allumer ou éteindre ; allumer un module
//     hors licence l'« accorde » au tenant ;
//   - l'administrateur du tenant n'allume ou n'éteint que les modules autorisés
//     (inclus dans sa licence ou accordés) ; les autres restent verrouillés.
import { Tenant, TenantModule, AuditLog } from '../models/index.js';
import { MODULES, MODULE_GROUPS, MODULE_BY_KEY, OFFRES, OPTIONS, dependentsOf } from '../config/modules.js';
import { getTenantModules, invalidateTenantModules } from '../utils/tenantModules.js';

const isSuperAdmin = (user) => user?.role === 'superadmin';

const audit = (req, tenantId, action, details) =>
  AuditLog.log({ user: req.user, tenantId, ip: req.ip, headers: req.headers }, action, 'tenant_module', details.module, details);

async function view(tenantId, user) {
  const { states, license } = await getTenantModules(tenantId);
  const superAdmin = isSuperAdmin(user);
  return {
    success: true,
    superAdmin,
    canManage: superAdmin || user?.role === 'admin',
    license,
    offres: Object.fromEntries(Object.entries(OFFRES).map(([k, o]) => [k, { label: o.label, modules: o.modules }])),
    options: OPTIONS,
    groups: MODULE_GROUPS,
    modules: MODULES.map(m => ({
      key: m.key,
      group: m.group,
      label: m.label,
      description: m.description,
      deps: m.deps || [],
      dependents: dependentsOf(m.key),
      wired: !!m.wired,
      ...states[m.key],
    })),
  };
}

async function save(req, tenantId) {
  const key = req.params.key;
  const mod = MODULE_BY_KEY[key];
  if (!mod) return { status: 404, body: { success: false, message: 'Module inconnu.' } };
  if (!mod.wired) return { status: 400, body: { success: false, message: `Le module « ${mod.label} » n’est pas encore activable séparément.` } };

  const superAdmin = isSuperAdmin(req.user);
  const { enabled, granted } = req.body || {};
  if (enabled !== undefined && typeof enabled !== 'boolean') return { status: 400, body: { success: false, message: '« enabled » doit être vrai ou faux.' } };
  if (granted !== undefined && (typeof granted !== 'boolean' || !superAdmin)) {
    return { status: superAdmin ? 400 : 403, body: { success: false, message: 'Seul le super-administrateur peut accorder un module hors licence.' } };
  }

  const { states } = await getTenantModules(tenantId);
  const s = states[key];
  const next = {
    enabled: enabled ?? s.enabled,
    granted: granted ?? s.granted,
  };
  if (superAdmin && enabled === true && !s.inLicense && granted === undefined) next.granted = true;

  if (!superAdmin && !s.allowed) {
    return { status: 403, body: { success: false, code: 'MODULE_NOT_LICENSED', message: `Le module « ${mod.label} » n’est pas inclus dans votre licence.` } };
  }
  if (next.enabled) {
    const missing = (mod.deps || []).filter(d => !states[d].active);
    if (missing.length) {
      return { status: 400, body: { success: false, message: `Activez d’abord : ${missing.map(d => MODULE_BY_KEY[d].label).join(', ')}.` } };
    }
  }

  const [row] = await TenantModule.findOrCreate({
    where: { tenantId, moduleKey: key },
    defaults: { tenantId, moduleKey: key, enabled: s.enabled, granted: s.granted },
  });
  await row.update({ ...next, updatedBy: req.user.id });
  invalidateTenantModules(tenantId);

  const after = (await getTenantModules(tenantId)).states;
  const turnedOff = dependentsOf(key).filter(d => states[d].active && !after[d].active);
  await audit(req, tenantId, after[key].active ? 'MODULE_ENABLED' : 'MODULE_DISABLED', {
    module: key, enabled: next.enabled, granted: next.granted, ...(turnedOff.length ? { aussiCoupes: turnedOff } : {}),
  });

  const body = await view(tenantId, req.user);
  const label = mod.label;
  body.message = after[key].active
    ? `Module « ${label} » activé.`
    : `Module « ${label} » désactivé.${turnedOff.length ? ` Également coupé : ${turnedOff.map(d => MODULE_BY_KEY[d].label).join(', ')}.` : ''}`;
  return { status: 200, body };
}

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error('[Modules]', err);
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Erreur lors de la lecture des modules.' });
  }
};

async function loadTenant(id) {
  const tenant = await Tenant.findByPk(id);
  if (!tenant) { const e = new Error('Client introuvable.'); e.status = 404; throw e; }
  return tenant;
}

// Tenant courant (Paramètres › Modules)
export const getModules = handle(async (req, res) => {
  res.json(await view(req.tenantId, req.user));
});
export const updateModule = handle(async (req, res) => {
  const r = await save(req, req.tenantId);
  res.status(r.status).json(r.body);
});

// Super-administrateur (Clients SaaS)
export const superGetModules = handle(async (req, res) => {
  await loadTenant(req.params.id);
  res.json(await view(req.params.id, req.user));
});
export const superUpdateModule = handle(async (req, res) => {
  await loadTenant(req.params.id);
  const r = await save(req, req.params.id);
  res.status(r.status).json(r.body);
});
