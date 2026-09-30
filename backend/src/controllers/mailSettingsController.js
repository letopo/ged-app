// backend/src/controllers/mailSettingsController.js
// Paramètres › Messagerie : réglages SMTP propres à chaque tenant.
//
// Droits :
//  - superadmin : tous les tenants (routes /api/super-admin/tenants/:id/mail-settings)
//    et le sien (routes /api/mail-settings) ; lui seul décide si les
//    administrateurs d'un tenant peuvent gérer la messagerie (adminCanManage) ;
//  - admin : uniquement la messagerie de son tenant, et seulement si le
//    superadmin le lui a permis.
// Le mot de passe est chiffré (utils/secretBox.js) et n'est jamais renvoyé.
import { Tenant, TenantMailSettings, AuditLog } from '../models/index.js';
import { MAIL_SECURITY_MODES } from '../models/TenantMailSettings.js';
import { encryptSecret, decryptSecret } from '../utils/secretBox.js';
import { transportOptions, sendTestEmail } from '../utils/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEST_LIMIT = 5;             // e-mails de test par utilisateur…
const TEST_WINDOW_MS = 60_000;    // …et par minute
const testHistory = new Map();

const isSuperAdmin = (user) => user?.role === 'superadmin';

// Vue renvoyée au navigateur : jamais le mot de passe, seulement s'il existe
function publicView(settings) {
  if (!settings) return null;
  const s = settings.get();
  return {
    enabled: s.enabled, host: s.host, port: s.port, security: s.security,
    username: s.username, fromName: s.fromName, fromEmail: s.fromEmail, replyTo: s.replyTo,
    adminCanManage: s.adminCanManage,
    hasPassword: Boolean(s.passwordEncrypted),
    passwordUnreadable: Boolean(s.passwordEncrypted) && decryptSecret(s.passwordEncrypted) === null,
    lastTestAt: s.lastTestAt, lastTestOk: s.lastTestOk, lastTestError: s.lastTestError,
    lastSentAt: s.lastSentAt, lastErrorAt: s.lastErrorAt, lastError: s.lastError,
    updatedAt: s.updatedAt,
  };
}

// Ce que fait la messagerie du serveur (.env) pour un tenant sans réglage propre
const serverFallback = () => ({
  enabled: process.env.WORKFLOW_ENABLE_NOTIFICATIONS !== 'false',
  configured: Boolean(process.env.SMTP_USER),
});

async function loadTenant(tenantId) {
  const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'name', 'domain'] });
  if (!tenant) { const e = new Error('Tenant introuvable.'); e.status = 404; throw e; }
  return tenant;
}

// Accès aux réglages du tenant de la requête (routes /api/mail-settings)
async function tenantAccess(req) {
  const settings = await TenantMailSettings.findOne({ where: { tenantId: req.tenantId } });
  const canManage = isSuperAdmin(req.user) || (req.user?.role === 'admin' && Boolean(settings?.adminCanManage));
  return { settings, canManage };
}

// Journal d'activité rattaché au tenant concerné (le superadmin agit hors tenant)
const audit = (req, tenantId, action, details) =>
  AuditLog.log({ user: req.user, tenantId, ip: req.ip, headers: req.headers }, action, 'tenant', tenantId, details);

// ── Lecture ──────────────────────────────────────────────────────────────────
async function view(tenantId, user, settings) {
  const tenant = await loadTenant(tenantId);
  return {
    success: true,
    tenant: { id: tenant.id, name: tenant.name, domain: tenant.domain },
    canManage: true,
    canDelegate: isSuperAdmin(user),
    settings: publicView(settings),
    source: settings ? 'tenant' : 'server',
    server: serverFallback(),
  };
}

// ── Enregistrement ───────────────────────────────────────────────────────────
function validate(body, current) {
  const errors = [];
  const enabled = body.enabled === undefined ? current?.enabled ?? false : Boolean(body.enabled);
  const host = (body.host ?? current?.host ?? '').trim();
  const port = body.port === undefined || body.port === '' ? current?.port ?? null : Number(body.port);
  const security = body.security ?? current?.security ?? 'starttls';
  const username = (body.username ?? current?.username ?? '').trim();
  const fromEmail = (body.fromEmail ?? current?.fromEmail ?? '').trim();
  const replyTo = (body.replyTo ?? current?.replyTo ?? '').trim();

  if (!MAIL_SECURITY_MODES.includes(security)) errors.push('Type de sécurité inconnu.');
  if (port !== null && (!Number.isInteger(port) || port < 1 || port > 65535)) errors.push('Port invalide (1 à 65535).');
  if (fromEmail && !EMAIL_RE.test(fromEmail)) errors.push("Adresse de l'expéditeur invalide.");
  if (replyTo && !EMAIL_RE.test(replyTo)) errors.push('Adresse de réponse invalide.');
  if (enabled) {
    if (!host) errors.push('Le serveur de messagerie est obligatoire pour activer l’envoi.');
    if (!username && !fromEmail) errors.push("Renseignez le compte ou l'adresse de l'expéditeur.");
  }
  return { errors, values: { enabled, host: host || null, port, security, username: username || null, fromEmail: fromEmail || null, replyTo: replyTo || null } };
}

// Mot de passe d'application Gmail affiché « abcd efgh ijkl mnop » : espaces retirés
const cleanPassword = (password, host) =>
  /gmail\.com|googlemail\.com/i.test(host || '') ? String(password).replace(/\s+/g, '') : String(password);

async function save(req, tenantId, settings) {
  const body = req.body || {};
  const { errors, values } = validate(body, settings);
  if (errors.length) return { status: 400, body: { success: false, message: errors.join(' '), errors } };

  const fields = { ...values, fromName: (body.fromName ?? settings?.fromName ?? '').trim() || null, updatedBy: req.user.id };
  let passwordChanged = false;
  if (body.clearPassword) { fields.passwordEncrypted = null; passwordChanged = true; }
  else if (typeof body.password === 'string' && body.password !== '') {
    fields.passwordEncrypted = encryptSecret(cleanPassword(body.password, values.host));
    passwordChanged = true;
  }
  if (isSuperAdmin(req.user) && body.adminCanManage !== undefined) fields.adminCanManage = Boolean(body.adminCanManage);
  const willHavePassword = 'passwordEncrypted' in fields ? Boolean(fields.passwordEncrypted) : Boolean(settings?.passwordEncrypted);
  if (fields.enabled && values.username && !willHavePassword) {
    return { status: 400, body: { success: false, message: 'Le mot de passe du compte est obligatoire.' } };
  }

  const before = settings ? publicView(settings) : null;
  if (settings) await settings.update(fields);
  else settings = await TenantMailSettings.create({ ...fields, tenantId });

  const changed = Object.keys(fields).filter(k => !['passwordEncrypted', 'updatedBy'].includes(k) && before?.[k] !== fields[k]);
  await audit(req, tenantId, 'MAIL_SETTINGS_UPDATED', { changed, passwordChanged });
  return { status: 200, body: { ...(await view(tenantId, req.user, settings)), message: 'Réglages de messagerie enregistrés.' } };
}

// ── Test ─────────────────────────────────────────────────────────────────────
// Teste les valeurs du formulaire (même non enregistrées) complétées par les
// réglages enregistrés ; le mot de passe enregistré sert si aucun n'est saisi.
async function test(req, tenantId, settings) {
  const now = Date.now();
  const recent = (testHistory.get(req.user.id) || []).filter(t => now - t < TEST_WINDOW_MS);
  if (recent.length >= TEST_LIMIT) {
    return { status: 429, body: { success: false, message: 'Trop d’essais : patientez une minute.' } };
  }
  testHistory.set(req.user.id, [...recent, now]);

  const body = req.body || {};
  const { errors, values } = validate({ ...body, enabled: true }, settings);
  if (errors.length) return { status: 400, body: { success: false, message: errors.join(' ') } };
  const to = (body.to || req.user.email || '').trim();
  if (!EMAIL_RE.test(to)) return { status: 400, body: { success: false, message: 'Adresse du destinataire du test invalide.' } };

  let password = typeof body.password === 'string' && body.password !== '' ? cleanPassword(body.password, values.host) : decryptSecret(settings?.passwordEncrypted);
  if (values.username && !password) {
    return { status: 400, body: { success: false, message: settings?.passwordEncrypted ? 'Mot de passe enregistré illisible : ressaisissez-le.' : 'Saisissez le mot de passe du compte.' } };
  }

  const tenant = await loadTenant(tenantId);
  const brand = { name: tenant.name, appUrl: tenant.domain ? `https://${tenant.domain}` : undefined };
  const fromName = ((body.fromName ?? settings?.fromName ?? '').trim() || `GED ${tenant.name}`).replace(/"/g, '');
  const record = async (fields) => { if (settings) await TenantMailSettings.update(fields, { where: { id: settings.id }, silent: true }); };
  try {
    await sendTestEmail({
      transport: transportOptions({ ...values, password }),
      from: `"${fromName}" <${values.fromEmail || values.username}>`,
      replyTo: values.replyTo || undefined,
      to, brand,
    });
    await record({ lastTestAt: new Date(), lastTestOk: true, lastTestError: null });
    await audit(req, tenantId, 'MAIL_SETTINGS_TESTED', { ok: true, to });
    return { status: 200, body: { success: true, message: `E-mail de test envoyé à ${to}. Vérifiez la boîte de réception (et les spams).` } };
  } catch (err) {
    console.warn('Test messagerie échoué :', err.raw || err.message);
    await record({ lastTestAt: new Date(), lastTestOk: false, lastTestError: err.message });
    await audit(req, tenantId, 'MAIL_SETTINGS_TESTED', { ok: false, to, error: err.message });
    return { status: 400, body: { success: false, message: err.message, detail: err.raw } };
  }
}

const handle = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error('Messagerie :', error);
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Erreur serveur.' });
  }
};

// ── Routes du tenant courant : /api/mail-settings ────────────────────────────
export const getMailSettings = handle(async (req, res) => {
  const { settings, canManage } = await tenantAccess(req);
  if (!canManage) return res.json({ success: true, canManage: false });
  res.json(await view(req.tenantId, req.user, settings));
});

export const updateMailSettings = handle(async (req, res) => {
  const { settings, canManage } = await tenantAccess(req);
  if (!canManage) return res.status(403).json({ success: false, message: 'Accès réservé.' });
  const r = await save(req, req.tenantId, settings);
  res.status(r.status).json(r.body);
});

export const testMailSettings = handle(async (req, res) => {
  const { settings, canManage } = await tenantAccess(req);
  if (!canManage) return res.status(403).json({ success: false, message: 'Accès réservé.' });
  const r = await test(req, req.tenantId, settings);
  res.status(r.status).json(r.body);
});

// ── Routes superadmin (tous les tenants) : /api/super-admin/tenants/:id/mail-settings
const tenantSettings = (tenantId) => TenantMailSettings.findOne({ where: { tenantId } });

export const superGetMailSettings = handle(async (req, res) => {
  res.json(await view(req.params.id, req.user, await tenantSettings(req.params.id)));
});

export const superUpdateMailSettings = handle(async (req, res) => {
  await loadTenant(req.params.id);
  const r = await save(req, req.params.id, await tenantSettings(req.params.id));
  res.status(r.status).json(r.body);
});

export const superTestMailSettings = handle(async (req, res) => {
  const r = await test(req, req.params.id, await tenantSettings(req.params.id));
  res.status(r.status).json(r.body);
});
