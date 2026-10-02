// backend/src/controllers/integrationController.js
// Paramètres › IA · OCR (kind 'ai') et › Intégrations (kind 'sage').
//
// Droits (comme la messagerie) : le superadmin règle tous les tenants et
// décide, par intégration, si les administrateurs du tenant peuvent la gérer
// (adminCanManage) ; un administrateur ne voit que son tenant.
// Secrets (clé d'API, mot de passe Sage) chiffrés, jamais renvoyés.
import { Tenant, TenantIntegration, AuditLog } from '../models/index.js';
import { INTEGRATION_KINDS } from '../models/TenantIntegration.js';
import { encryptSecret, decryptSecret } from '../utils/secretBox.js';
import {
  DEFAULT_AI_MODEL, testAiConfig, SAGE_DEFAULTS, SAGE_FILTER_MODES, fetchSageFactures,
  parseComptesCollectifs, phpBeneficiaryType, isIsoDate,
} from '../utils/integrations.js';
import { openSagePool, runSageSyncNow } from '../utils/sageFactureSync.js';

const TEST_LIMIT = 5;
const TEST_WINDOW_MS = 60_000;
const testHistory = new Map();
const isSuperAdmin = (user) => user?.role === 'superadmin';

// Modèles proposés à l'écran (saisie libre possible)
const AI_MODELS = ['claude-sonnet-5', 'claude-opus-5-5', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-6'];
const AI_DEFAULTS = { model: DEFAULT_AI_MODEL };

const defaultsOf = (kind) => (kind === 'ai' ? AI_DEFAULTS : SAGE_DEFAULTS);

function publicView(kind, row) {
  const config = { ...defaultsOf(kind), ...(row?.config || {}) };
  if (!row) return { enabled: false, config, hasSecret: false, adminCanManage: false };
  return {
    enabled: row.enabled, config, adminCanManage: row.adminCanManage,
    hasSecret: Boolean(row.secretEncrypted),
    secretUnreadable: Boolean(row.secretEncrypted) && decryptSecret(row.secretEncrypted) === null,
    lastTestAt: row.lastTestAt, lastTestOk: row.lastTestOk, lastTestError: row.lastTestError,
    lastRunAt: row.lastRunAt, lastRunOk: row.lastRunOk, lastRunMessage: row.lastRunMessage,
    updatedAt: row.updatedAt,
  };
}

async function view(kind, tenantId, user, row) {
  const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'name', 'domain'] });
  if (!tenant) { const e = new Error('Tenant introuvable.'); e.status = 404; throw e; }
  const extra = kind === 'ai'
    ? { models: AI_MODELS, server: { configured: Boolean(process.env.ANTHROPIC_API_KEY), model: DEFAULT_AI_MODEL } }
    : { filterModes: SAGE_FILTER_MODES };
  return {
    success: true, kind, tenant: { id: tenant.id, name: tenant.name },
    canManage: true, canDelegate: isSuperAdmin(user),
    source: row ? 'tenant' : (kind === 'ai' ? 'server' : 'none'),
    integration: publicView(kind, row), ...extra,
  };
}

// ── Validation ───────────────────────────────────────────────────────────────
const str = (v, max) => (v === undefined || v === null ? undefined : String(v).trim().slice(0, max));

function validate(kind, body, current, enabled, hasSecret) {
  const errors = [];
  const cfg = { ...defaultsOf(kind), ...(current?.config || {}) };
  const input = body.config || {};
  if (kind === 'ai') {
    const model = str(input.model, 80);
    if (model !== undefined) cfg.model = model;
    if (!/^[a-z0-9][a-z0-9.\-]{2,79}$/i.test(cfg.model || '')) errors.push('Nom de modèle invalide.');
    if (enabled && !hasSecret) errors.push("La clé d'API est obligatoire pour activer la lecture par IA.");
  } else {
    for (const [k, max] of [['host', 255], ['database', 128], ['domain', 128], ['username', 128], ['filterValue', 2000], ['documentCategory', 100], ['workflowTemplateName', 150], ['importFromDate', 10]]) {
      const v = str(input[k], max);
      if (v !== undefined) cfg[k] = v;
    }
    if (input.authType !== undefined) cfg.authType = input.authType;
    if (input.filterMode !== undefined) cfg.filterMode = input.filterMode;
    if (input.invoiceStatus !== undefined) cfg.invoiceStatus = input.invoiceStatus;
    if (input.port !== undefined && input.port !== '') cfg.port = Number(input.port);
    if (input.syncIntervalMinutes !== undefined && input.syncIntervalMinutes !== '') cfg.syncIntervalMinutes = Number(input.syncIntervalMinutes);

    if (!['ntlm', 'sql'].includes(cfg.authType)) errors.push('Type de connexion inconnu.');
    if (!SAGE_FILTER_MODES.includes(cfg.filterMode)) errors.push('Critère de filtre inconnu.');
    if (!cfg.invoiceStatus) cfg.invoiceStatus = 'all';
    if (!['all', 'posted'].includes(cfg.invoiceStatus)) errors.push('État des factures inconnu.');
    if (!Number.isInteger(cfg.port) || cfg.port < 1 || cfg.port > 65535) errors.push('Port invalide (1 à 65535).');
    if (!Number.isInteger(cfg.syncIntervalMinutes) || cfg.syncIntervalMinutes < 5 || cfg.syncIntervalMinutes > 1440) errors.push('Fréquence invalide (5 à 1440 minutes).');
    if (cfg.filterMode === 'cat_tarif' && cfg.filterValue && !/^\d+$/.test(cfg.filterValue)) errors.push('La catégorie tarifaire doit être un nombre.');
    // Pas de date de début → aujourd'hui (jamais d'import de tout l'historique par défaut)
    if (!cfg.importFromDate) cfg.importFromDate = new Date().toISOString().slice(0, 10);
    if (!isIsoDate(cfg.importFromDate)) errors.push('Date de début de l’import invalide.');
    if (cfg.filterMode === 'compte_collectif' && parseComptesCollectifs(cfg.filterValue).some(c => !/^\d{3,13}$/.test(c))) {
      errors.push('Les comptes collectifs sont des numéros (ex. 4127000, 4122000).');
    }
    if (enabled) {
      if (!cfg.host || !cfg.database) errors.push('Serveur et base de données sont obligatoires pour activer Sage.');
      if (!cfg.username || !hasSecret) errors.push('Compte et mot de passe Sage sont obligatoires pour activer Sage.');
      if (!cfg.documentCategory || !cfg.workflowTemplateName) errors.push('Catégorie et modèle de workflow sont obligatoires.');
    }
  }
  return { errors, config: cfg };
}

// ── Accès ────────────────────────────────────────────────────────────────────
function checkKind(req) {
  if (!INTEGRATION_KINDS.includes(req.params.kind)) { const e = new Error('Intégration inconnue.'); e.status = 404; throw e; }
  return req.params.kind;
}

async function tenantAccess(req, kind) {
  const row = await TenantIntegration.findOne({ where: { tenantId: req.tenantId, kind } });
  const canManage = isSuperAdmin(req.user) || (req.user?.role === 'admin' && Boolean(row?.adminCanManage));
  return { row, canManage };
}

const audit = (req, tenantId, action, details) =>
  AuditLog.log({ user: req.user, tenantId, ip: req.ip, headers: req.headers }, action, 'tenant', tenantId, details);

function rateLimited(req) {
  const now = Date.now();
  const recent = (testHistory.get(req.user.id) || []).filter(t => now - t < TEST_WINDOW_MS);
  if (recent.length >= TEST_LIMIT) return true;
  testHistory.set(req.user.id, [...recent, now]);
  return false;
}

// ── Actions ──────────────────────────────────────────────────────────────────
async function save(req, kind, tenantId, row) {
  const body = req.body || {};
  const newSecret = typeof body.secret === 'string' && body.secret.trim() !== '' ? body.secret.trim() : null;
  const hasSecret = body.clearSecret ? false : Boolean(newSecret || row?.secretEncrypted);
  const enabled = body.enabled === undefined ? Boolean(row?.enabled) : Boolean(body.enabled);
  const { errors, config } = validate(kind, body, row, enabled, hasSecret);
  if (errors.length) return { status: 400, body: { success: false, message: errors.join(' '), errors } };

  const fields = { enabled, config, updatedBy: req.user.id };
  if (body.clearSecret) fields.secretEncrypted = null;
  else if (newSecret) fields.secretEncrypted = encryptSecret(newSecret);
  if (isSuperAdmin(req.user) && body.adminCanManage !== undefined) fields.adminCanManage = Boolean(body.adminCanManage);

  const before = row ? { enabled: row.enabled, ...row.config } : {};
  if (row) await row.update(fields);
  else row = await TenantIntegration.create({ ...fields, tenantId, kind });

  const changed = Object.keys({ enabled, ...config }).filter(k => JSON.stringify(before[k]) !== JSON.stringify(k === 'enabled' ? enabled : config[k]));
  await audit(req, tenantId, 'INTEGRATION_UPDATED', { kind, changed, secretChanged: Boolean(newSecret || body.clearSecret) });
  return { status: 200, body: { ...(await view(kind, tenantId, req.user, row)), message: 'Réglages enregistrés.' } };
}

// Valeurs du formulaire (même non enregistrées) complétées par l'enregistré
function formConfig(req, kind, row) {
  const body = req.body || {};
  const { errors, config } = validate(kind, body, row, false, true);
  const secret = typeof body.secret === 'string' && body.secret.trim() !== '' ? body.secret.trim() : decryptSecret(row?.secretEncrypted);
  return { errors, config, secret };
}

async function test(req, kind, tenantId, row) {
  if (rateLimited(req)) return { status: 429, body: { success: false, message: 'Trop d’essais : patientez une minute.' } };
  const { errors, config, secret } = formConfig(req, kind, row);
  if (errors.length) return { status: 400, body: { success: false, message: errors.join(' ') } };
  if (!secret) return { status: 400, body: { success: false, message: kind === 'ai' ? "Saisissez la clé d'API." : 'Saisissez le mot de passe Sage.' } };

  const record = (fields) => row && TenantIntegration.update(fields, { where: { id: row.id }, silent: true });
  try {
    let message;
    if (kind === 'ai') {
      await testAiConfig({ apiKey: secret, model: config.model });
      message = `Clé valide : le modèle ${config.model} répond.`;
    } else {
      if (!config.host || !config.database) return { status: 400, body: { success: false, message: 'Renseignez le serveur et la base.' } };
      let pool;
      try {
        pool = await openSagePool(config, secret);
      } catch (err) {
        // Base introuvable : on liste celles du serveur pour aider à choisir
        if (/Base de données introuvable|Cannot open database/i.test(err.message + (err.raw || ''))) {
          const names = await listSageDatabases(config, secret).catch(() => null);
          if (names?.length) err.message = `La base « ${config.database} » n'existe pas sur ce serveur. Bases disponibles : ${names.join(', ')}.`;
        }
        throw err;
      }
      try {
        const r = await pool.request().query('SELECT SUM(CASE WHEN DO_Type = 7 THEN 1 ELSE 0 END) AS comptabilisees, SUM(CASE WHEN DO_Type = 6 THEN 1 ELSE 0 END) AS enCours FROM F_DOCENTETE WHERE DO_Type IN (6, 7) AND DO_Domaine = 0');
        const { comptabilisees = 0, enCours = 0 } = r.recordset[0] || {};
        message = `Connexion réussie : ${comptabilisees || 0} facture(s) de vente comptabilisée(s) et ${enCours || 0} non comptabilisée(s) dans la base ${config.database}.`;
      } finally { await pool.close().catch(() => {}); }
    }
    await record({ lastTestAt: new Date(), lastTestOk: true, lastTestError: null });
    await audit(req, tenantId, 'INTEGRATION_TESTED', { kind, ok: true });
    return { status: 200, body: { success: true, message } };
  } catch (err) {
    const { message } = err;
    console.warn(`Test intégration ${kind} échoué :`, err.raw || err.message);
    await record({ lastTestAt: new Date(), lastTestOk: false, lastTestError: message });
    await audit(req, tenantId, 'INTEGRATION_TESTED', { kind, ok: false, error: message });
    return { status: 400, body: { success: false, message } };
  }
}

// Sage : les factures qui seraient importées (rien n'est importé)
async function preview(req, tenantId, row) {
  if (rateLimited(req)) return { status: 429, body: { success: false, message: 'Trop d’essais : patientez une minute.' } };
  const { errors, config, secret } = formConfig(req, 'sage', row);
  if (errors.length) return { status: 400, body: { success: false, message: errors.join(' ') } };
  if (!secret) return { status: 400, body: { success: false, message: 'Saisissez le mot de passe Sage.' } };
  try {
    const pool = await openSagePool(config, secret);
    try {
      const rows = await fetchSageFactures(pool, config, 20);
      if (rows === null) return { status: 200, body: { success: true, rows: [], message: 'Choisissez un critère « facture PHP » : sans critère, rien n’est importé.' } };
      return {
        status: 200,
        body: {
          success: true,
          message: rows.length ? `${rows.length} facture(s) correspondent (les 20 plus récentes).` : 'Aucune facture ne correspond à ce critère.',
          rows: rows.map(r => ({ piece: r.DO_Piece, comptabilisee: r.DO_Type === 7, date: r.DO_Date, client: r.CT_Intitule, clientNum: r.DO_Tiers, compteCollectif: r.CG_NumPrinc || null, type: phpBeneficiaryType(r.CG_NumPrinc), totalTTC: r.DO_TotalTTC })),
        },
      };
    } finally { await pool.close().catch(() => {}); }
  } catch (err) {
    return { status: 400, body: { success: false, message: err.message } };
  }
}

async function syncNow(req, tenantId, row) {
  if (!row?.enabled) return { status: 400, body: { success: false, message: 'Activez et enregistrez l’intégration Sage avant de synchroniser.' } };
  const result = await runSageSyncNow(row);
  await audit(req, tenantId, 'INTEGRATION_SYNC', { kind: 'sage', ok: result.ok, imported: result.imported || 0 });
  return { status: result.ok ? 200 : 400, body: { success: result.ok, message: result.message, imported: result.imported || 0 } };
}

// Bases de l'instance (connexion à master), hors bases système
async function listSageDatabases(config, secret) {
  const pool = await openSagePool({ ...config, database: 'master' }, secret);
  try {
    const r = await pool.request().query("SELECT name FROM sys.databases WHERE name NOT IN ('master','tempdb','model','msdb') ORDER BY name");
    return r.recordset.map(x => x.name);
  } finally { await pool.close().catch(() => {}); }
}

const handle = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error('Intégrations :', error);
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Erreur serveur.' });
  }
};
const reply = (res, r) => res.status(r.status).json(r.body);
const forbidden = (res) => res.status(403).json({ success: false, message: 'Accès réservé.' });

// ── Tenant courant : /api/integrations/:kind ─────────────────────────────────
export const getIntegration = handle(async (req, res) => {
  const kind = checkKind(req);
  const { row, canManage } = await tenantAccess(req, kind);
  if (!canManage) return res.json({ success: true, canManage: false });
  res.json(await view(kind, req.tenantId, req.user, row));
});
export const updateIntegration = handle(async (req, res) => {
  const kind = checkKind(req);
  const { row, canManage } = await tenantAccess(req, kind);
  if (!canManage) return forbidden(res);
  reply(res, await save(req, kind, req.tenantId, row));
});
export const testIntegration = handle(async (req, res) => {
  const kind = checkKind(req);
  const { row, canManage } = await tenantAccess(req, kind);
  if (!canManage) return forbidden(res);
  reply(res, await test(req, kind, req.tenantId, row));
});
export const previewSage = handle(async (req, res) => {
  const { row, canManage } = await tenantAccess(req, 'sage');
  if (!canManage) return forbidden(res);
  reply(res, await preview(req, req.tenantId, row));
});
export const syncSage = handle(async (req, res) => {
  const { row, canManage } = await tenantAccess(req, 'sage');
  if (!canManage) return forbidden(res);
  reply(res, await syncNow(req, req.tenantId, row));
});

// ── Superadmin, tout tenant : /api/super-admin/tenants/:id/integrations/:kind ─
const rowOf = (tenantId, kind) => TenantIntegration.findOne({ where: { tenantId, kind } });
export const superGetIntegration = handle(async (req, res) => {
  const kind = checkKind(req);
  res.json(await view(kind, req.params.id, req.user, await rowOf(req.params.id, kind)));
});
export const superUpdateIntegration = handle(async (req, res) => {
  const kind = checkKind(req);
  reply(res, await save(req, kind, req.params.id, await rowOf(req.params.id, kind)));
});
export const superTestIntegration = handle(async (req, res) => {
  const kind = checkKind(req);
  reply(res, await test(req, kind, req.params.id, await rowOf(req.params.id, kind)));
});
export const superPreviewSage = handle(async (req, res) => {
  reply(res, await preview(req, req.params.id, await rowOf(req.params.id, 'sage')));
});
export const superSyncSage = handle(async (req, res) => {
  reply(res, await syncNow(req, req.params.id, await rowOf(req.params.id, 'sage')));
});
