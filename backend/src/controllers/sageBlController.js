// backend/src/controllers/sageBlController.js
// « BL PHP en attente de facturation » : lecture directe de Sage (rien n'est importé).
// Accès : superadmin + titulaires des postes autorisés (liste réglable par le
// superadmin, défaut : Service Facturation, DG, CCG).
import { TenantIntegration, TenantSettings, Poste, AuditLog } from '../models/index.js';
import { decryptSecret } from '../utils/secretBox.js';
import { SAGE_DEFAULTS } from '../utils/integrations.js';
import { openSagePool } from '../utils/sageFactureSync.js';
import { fetchPendingBl, fetchBlLines, groupIntoBpc, summarize, fetchInvoiceSpanControl } from '../utils/sageBl.js';
import { getUserPosteCodes } from '../utils/posteResolver.js';

export const DEFAULT_BL_ACCESS_POSTES = ['facturation', 'dg', 'ccg'];
const CACHE_MS = 60_000;
const cache = new Map(); // tenantId → { at, data }

export async function getBlAccessPostes(tenantId) {
  const row = await TenantSettings.findOne({ where: { tenantId }, attributes: ['sageBlAccessPostes'] });
  return Array.isArray(row?.sageBlAccessPostes) ? row.sageBlAccessPostes : DEFAULT_BL_ACCESS_POSTES;
}

export async function canAccessSageBl(user, tenantId) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  const allowed = await getBlAccessPostes(tenantId);
  const mine = await getUserPosteCodes(user.id);
  return mine.some(c => allowed.includes(c));
}

const guard = (fn) => async (req, res) => {
  try {
    if (!(await canAccessSageBl(req.user, req.tenantId))) {
      return res.status(403).json({ success: false, message: 'Accès réservé (BL PHP) : demandez au superadmin.' });
    }
    await fn(req, res);
  } catch (err) {
    console.error('BL PHP Sage :', err);
    res.status(502).json({ success: false, message: err.message || 'Sage injoignable.' });
  }
};

async function withSage(tenantId, fn) {
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'sage' } });
  if (!row) { const e = new Error('Connexion Sage non réglée (Paramètres › Intégrations).'); e.status = 400; throw e; }
  const pool = await openSagePool({ ...SAGE_DEFAULTS, ...row.config }, decryptSecret(row.secretEncrypted));
  try { return await fn(pool); } finally { await pool.close().catch(() => {}); }
}

// GET /api/sage-bl/summary?refresh=1 — BPC en attente + indicateurs (cache 60 s)
export const getSummary = guard(async (req, res) => {
  const hit = cache.get(req.tenantId);
  if (hit && !req.query.refresh && Date.now() - hit.at < CACHE_MS) return res.json({ success: true, ...hit.data, cached: true });
  const rows = await withSage(req.tenantId, fetchPendingBl);
  const bpcs = groupIntoBpc(rows);
  const data = { generatedAt: new Date().toISOString(), kpis: summarize(bpcs), bpcs };
  cache.set(req.tenantId, { at: Date.now(), data });
  res.json({ success: true, ...data });
});

// GET /api/sage-bl/lines?pieces=BL1,BL2 — actes des BL d'un BPC
export const getLines = guard(async (req, res) => {
  const pieces = String(req.query.pieces || '').split(',').map(s => s.trim()).filter(Boolean);
  const lines = await withSage(req.tenantId, pool => fetchBlLines(pool, pieces));
  res.json({ success: true, lines });
});

// GET /api/sage-bl/controle?days=30 — factures regroupant des BL sur plus de 3 jours
export const getControl = guard(async (req, res) => {
  const data = await withSage(req.tenantId, pool => fetchInvoiceSpanControl(pool, req.query.days));
  res.json({ success: true, ...data });
});

// GET /api/sage-bl/access — postes autorisés (+ catalogue des postes pour le superadmin)
export const getAccess = async (req, res) => {
  const allowed = await getBlAccessPostes(req.tenantId);
  const canEdit = req.user.role === 'superadmin';
  const postes = canEdit ? await Poste.findAll({ attributes: ['code', 'label'], order: [['label', 'ASC']] }) : [];
  res.json({ success: true, allowed, canEdit, canAccess: await canAccessSageBl(req.user, req.tenantId), postes });
};

// PUT /api/sage-bl/access { postes: [...] } — superadmin
export const updateAccess = async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Réservé au superadmin.' });
  const known = (await Poste.findAll({ attributes: ['code'] })).map(p => p.code);
  const postes = [...new Set((Array.isArray(req.body?.postes) ? req.body.postes : []).filter(c => known.includes(c)))];
  const before = await getBlAccessPostes(req.tenantId);
  const [row] = await TenantSettings.findOrCreate({ where: { tenantId: req.tenantId }, defaults: { tenantId: req.tenantId } });
  await row.update({ sageBlAccessPostes: postes, updatedBy: req.user.id });
  await AuditLog.log(req, 'TENANT_SETTINGS_UPDATED', 'tenant', req.tenantId, { sageBlAccessPostes: { avant: before, après: postes } });
  res.json({ success: true, allowed: postes, message: 'Accès mis à jour.' });
};
