// backend/src/utils/integrations.js
// Réglages d'intégration par tenant (Paramètres › IA · OCR et › Intégrations).
//  - IA : clé d'API Anthropic + modèle. Sans réglage propre, on garde la
//    configuration du serveur (.env : ANTHROPIC_API_KEY, ANTHROPIC_MODEL).
//  - Sage : connexion SQL Server en LECTURE SEULE + filtre des factures PHP,
//    exprimé par des choix guidés (jamais de SQL saisi par l'utilisateur).
import sql from 'mssql';
import { tenantNamespace } from '../config/database.js';
import { TenantIntegration } from '../models/index.js';
import { decryptSecret } from './secretBox.js';

export const getIntegration = (tenantId, kind) =>
  tenantId ? TenantIntegration.findOne({ where: { tenantId, kind } }) : null;

// ─── IA ──────────────────────────────────────────────────────────────────────
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
export const DEFAULT_AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// { apiKey, model, source } — apiKey null si aucune clé utilisable
export async function resolveAiConfig(tenantId = tenantNamespace.get('tenantId')) {
  const row = await getIntegration(tenantId, 'ai');
  if (row) {
    if (!row.enabled) return { apiKey: null, model: null, source: 'tenant', disabled: true };
    return { apiKey: decryptSecret(row.secretEncrypted), model: row.config?.model || DEFAULT_AI_MODEL, source: 'tenant' };
  }
  return { apiKey: process.env.ANTHROPIC_API_KEY || null, model: DEFAULT_AI_MODEL, source: 'server' };
}

// Pour les services d'extraction : configuration utilisable, sinon erreur claire
export async function requireAiConfig() {
  const cfg = await resolveAiConfig();
  if (!cfg.apiKey) {
    const err = new Error(cfg.disabled
      ? 'La lecture automatique par IA est désactivée pour votre organisation (Paramètres › IA · OCR).'
      : "Aucune clé d'IA configurée : renseignez-la dans Paramètres › IA · OCR.");
    err.code = 'NO_API_KEY';
    throw err;
  }
  return cfg;
}

// Appel minimal pour vérifier une clé et un modèle (quelques jetons)
export async function testAiConfig({ apiKey, model }) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION, 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'Réponds simplement : OK' }] }),
    signal: AbortSignal.timeout(20000),
  }).catch(err => { throw new Error(`Service d'IA injoignable (${err.name === 'TimeoutError' ? 'délai dépassé' : err.message}).`); });
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  const detail = body?.error?.message || `HTTP ${res.status}`;
  if (res.status === 401) throw new Error("Clé d'API refusée par Anthropic : vérifiez-la (elle commence par « sk-ant- »).");
  if (res.status === 404 || /model/i.test(detail)) throw new Error(`Modèle inconnu ou non autorisé pour cette clé : ${model}.`);
  if (res.status === 429) throw new Error('Quota ou limite de débit atteint sur ce compte Anthropic.');
  if (res.status === 400 && /credit|billing/i.test(detail)) throw new Error('Crédit insuffisant sur le compte Anthropic.');
  throw new Error(`Réponse d'Anthropic : ${detail}`);
}

// ─── Sage ────────────────────────────────────────────────────────────────────
export const SAGE_DEFAULTS = {
  host: '', port: 1433, database: '', authType: 'ntlm', domain: '', username: '',
  filterMode: 'none', filterValue: '',          // voir buildSageFilter
  syncIntervalMinutes: 15,
  documentCategory: 'Facture PHP Sage',
  workflowTemplateName: 'Circuit Facture PHP',
};
export const SAGE_FILTER_MODES = ['none', 'client_name', 'cat_tarif', 'client_nums'];

// Serveur « adresse\INSTANCE » (instance nommée, ex. 192.168.1.70\SAGE100) : le
// port est demandé au service SQL Browser (UDP 1434) à chaque connexion — il est
// souvent dynamique et change au redémarrage de SQL Server. Sinon : port saisi.
export function sageConnectionConfig(config, password) {
  const [server, instanceName] = String(config.host || '').split('\\').map(s => s.trim());
  const options = { encrypt: false, trustServerCertificate: true, connectTimeout: 8000, requestTimeout: 20000 };
  const base = {
    server,
    database: config.database,
    options: instanceName ? { ...options, instanceName } : options,
    ...(instanceName ? {} : { port: Number(config.port) || 1433 }),
  };
  if (config.authType === 'sql') return { ...base, user: config.username, password };
  return { ...base, authentication: { type: 'ntlm', options: { domain: config.domain || '', userName: config.username, password } } };
}

// Critère « facture PHP » : factures de vente (DO_Type 7, domaine 0) + choix
// guidé sur le client. Valeurs toujours passées en paramètres SQL.
// Sans critère client, rien n'est importé (mieux vaut ne rien importer que
// d'importer les mauvaises factures).
export function buildSageFilter(config, request) {
  const where = ['E.DO_Type = 7', 'E.DO_Domaine = 0'];
  const value = String(config.filterValue || '').trim();
  switch (config.filterMode) {
    case 'client_name':
      if (!value) return null;
      request.input('clientName', sql.NVarChar, `%${value}%`);
      where.push('C.CT_Intitule LIKE @clientName');
      break;
    case 'cat_tarif': {
      const n = Number(value);
      if (!Number.isInteger(n)) return null;
      request.input('catTarif', sql.Int, n);
      where.push('C.N_CatTarif = @catTarif');
      break;
    }
    case 'client_nums': {
      const nums = value.split(/[\s,;]+/).map(v => v.trim()).filter(Boolean).slice(0, 200);
      if (!nums.length) return null;
      nums.forEach((n, i) => request.input(`client${i}`, sql.VarChar, n));
      where.push(`E.DO_Tiers IN (${nums.map((_, i) => `@client${i}`).join(', ')})`);
      break;
    }
    default:
      return null;
  }
  return where.join(' AND ');
}

// Factures qualifiantes (SELECT uniquement)
export async function fetchSageFactures(pool, config, limit = 200) {
  const request = pool.request();
  const filter = buildSageFilter(config, request);
  if (!filter) return null;
  request.input('limit', sql.Int, limit);
  const result = await request.query(`
    SELECT TOP (@limit)
      E.DO_Piece, E.DO_Date, E.DO_Tiers, C.CT_Intitule, E.DO_TotalHT, E.DO_TotalTTC
    FROM F_DOCENTETE E
    LEFT JOIN F_COMPTET C ON C.CT_Num = E.DO_Tiers
    WHERE ${filter}
    ORDER BY E.DO_Date DESC
  `);
  return result.recordset;
}

// Message compréhensible pour une erreur de connexion à SQL Server
export function describeSageError(err) {
  const msg = err?.message || String(err);
  if (/Login failed|ELOGIN/i.test(msg) || err?.code === 'ELOGIN') return 'Identifiant ou mot de passe refusé par le serveur Sage (vérifiez aussi le domaine et le type de connexion).';
  if (/getaddrinfo|ENOTFOUND/i.test(msg)) return 'Serveur Sage introuvable : vérifiez son adresse.';
  if (['ETIMEOUT', 'ESOCKET', 'ECONNCLOSED'].includes(err?.code) || /timeout|ECONNREFUSED|ECONNRESET|socket hang up|Connection lost/i.test(msg)) {
    return 'Serveur Sage injoignable sur ce port. Pour une instance nommée, écrivez le serveur sous la forme « adresse\\INSTANCE » (ex. 192.168.1.70\\SAGE100).';
  }
  if (/Port for .* not found|Failed to get response from SQL Server Browser/i.test(msg)) return 'Instance SQL Server introuvable : vérifiez le nom après « \\ » (ex. SAGE100) et que le service SQL Browser est démarré.';
  if (/Cannot open database|database .* does not exist/i.test(msg)) return `Base de données introuvable sur le serveur Sage : ${msg}`;
  if (/Invalid object name/i.test(msg)) return 'Connexion réussie, mais les tables Sage (F_DOCENTETE, F_COMPTET) sont absentes de cette base.';
  return msg;
}
