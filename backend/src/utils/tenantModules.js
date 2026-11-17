// backend/src/utils/tenantModules.js — modules actifs d'un tenant.
//
// Un module est :
//   inclus   dans la licence du tenant (JWT signé, non expiré) ;
//   accordé  par le super-administrateur (tenant_modules.granted), même hors licence ;
//   autorisé = inclus OU accordé — seul un module autorisé peut être allumé ;
//   allumé   (tenant_modules.enabled ; sans réglage : allumé dès qu'il est autorisé) ;
//   actif    = autorisé ET allumé ET tous ses prérequis actifs.
//
// Lu à chaque requête d'un module (middleware/requireModule.js) : gardé 30 s en
// mémoire, vidé à chaque modification.
import jwt from 'jsonwebtoken';
import { License, TenantModule } from '../models/index.js';
import { PUBLIC_KEY } from '../config/licenseKeys.js';
import { MODULES, MODULE_KEYS, MODULE_BY_KEY, OFFRES, TEMPLATE_MODULES } from '../config/modules.js';

const TTL_MS = 30_000;
const cache = new Map(); // tenantId -> { value, at }

/** Modules inclus dans la licence du tenant ({ keys:Set, info }). */
export async function getLicensedModules(tenantId) {
  const empty = { keys: new Set(), info: { status: 'none' } };
  if (!tenantId || !PUBLIC_KEY) return empty;
  const row = await License.findOne({ where: { tenantId }, order: [['createdAt', 'DESC']] });
  if (!row) return empty;
  let decoded;
  try {
    decoded = jwt.verify(row.key, PUBLIC_KEY, { algorithms: ['RS256'] });
  } catch {
    return { keys: new Set(), info: { status: 'invalid' } };
  }
  const info = { status: 'active', client: decoded.clientName || null, expiresAt: decoded.expiresAt || null, offre: decoded.offre || null };
  if (decoded.expiresAt && new Date() > new Date(decoded.expiresAt)) {
    return { keys: new Set(), info: { ...info, status: 'expired' } };
  }
  let keys;
  if (Array.isArray(decoded.modules) || decoded.offre) {
    keys = new Set([
      ...(OFFRES[decoded.offre]?.modules || []),
      ...(Array.isArray(decoded.options) ? decoded.options : []),
      ...(Array.isArray(decoded.modules) ? decoded.modules : []),
    ].filter(k => MODULE_BY_KEY[k]));
  } else {
    // Licence antérieure au découpage en modules : tout est inclus
    keys = new Set(MODULE_KEYS);
    info.legacy = true;
  }
  return { keys, info };
}

async function compute(tenantId) {
  const [{ keys: licensed, info: license }, rows] = await Promise.all([
    getLicensedModules(tenantId),
    TenantModule.findAll({ where: { tenantId } }),
  ]);
  const byKey = Object.fromEntries(rows.map(r => [r.moduleKey, r]));
  const states = {};
  for (const m of MODULES) {
    const row = byKey[m.key];
    const inLicense = licensed.has(m.key);
    const granted = !!row?.granted;
    const allowed = inLicense || granted;
    const enabled = row ? !!row.enabled : allowed;
    states[m.key] = { key: m.key, inLicense, granted, allowed, enabled, active: false, missingDeps: [] };
  }
  // Actif = autorisé + allumé + prérequis actifs (résolu en profondeur)
  const resolve = (key, seen = new Set()) => {
    const s = states[key];
    if (s._done) return s.active;
    if (seen.has(key)) return false;
    seen.add(key);
    const deps = MODULE_BY_KEY[key].deps || [];
    s.missingDeps = deps.filter(d => !resolve(d, seen));
    s.active = s.allowed && s.enabled && s.missingDeps.length === 0;
    s._done = true;
    return s.active;
  };
  for (const key of MODULE_KEYS) resolve(key);
  for (const s of Object.values(states)) delete s._done;
  return { states, license, active: new Set(MODULE_KEYS.filter(k => states[k].active)) };
}

export async function getTenantModules(tenantId) {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await compute(tenantId);
  cache.set(tenantId, { value, at: Date.now() });
  return value;
}

/** Liste des modules actifs (pour le profil utilisateur → menus). */
export async function getActiveModuleKeys(tenantId) {
  if (!tenantId) return [...MODULE_KEYS];
  return [...(await getTenantModules(tenantId)).active];
}

export async function isModuleActive(tenantId, key) {
  if (!MODULE_BY_KEY[key]) throw new Error(`Module inconnu : ${key}`);
  return (await getTenantModules(tenantId)).active.has(key);
}

/** Module coupé dont dépend ce modèle de document (clé), sinon null. */
export async function templateModuleOff(tenantId, templateName) {
  const key = TEMPLATE_MODULES[templateName];
  if (!key || !tenantId) return null;
  return (await getTenantModules(tenantId)).active.has(key) ? null : key;
}

export const invalidateTenantModules = (tenantId) => cache.delete(tenantId);
