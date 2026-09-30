// backend/src/utils/mailer.js
import nodemailer from 'nodemailer';
import { tenantNamespace } from '../config/database.js';
import { Tenant, TenantMailSettings } from '../models/index.js';
import { decryptSecret } from './secretBox.js';

/**
 * Fonction pour envoyer un email de notification
 * @param {string} to - Email du destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} text - Contenu de l'email
 */
/**
 * Genere le HTML d'un email selon le type de notification
 */
const getEmailHTML = (subject, text, type = 'default', link = null, brand = {}) => {
  const brandName = brand.name || 'GED';
  const appUrl = brand.appUrl || process.env.APP_URL || 'http://localhost:3001';
  const colors = {
    approved: { accent: '#16a34a', bg: '#f0fdf4', icon: '&#10004;' },
    rejected: { accent: '#dc2626', bg: '#fef2f2', icon: '&#10006;' },
    task:     { accent: '#2563eb', bg: '#eff6ff', icon: '&#9997;' },
    chat:     { accent: '#6366f1', bg: '#eef2ff', icon: '&#128172;' },
    mention:  { accent: '#8b5cf6', bg: '#f5f3ff', icon: '&#64;' },
    default:  { accent: '#2563eb', bg: '#eff6ff', icon: '&#128196;' },
  };
  const c = colors[type] || colors.default;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background-color:white;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-top:4px solid ${c.accent};">
          <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
            <h1 style="color:${c.accent};margin:0;font-size:22px;">${brandName}</h1>
            <p style="color:#6b7280;margin:4px 0 0;font-size:13px;">Gestion Electronique de Documents</p>
          </div>
          <div style="background:${c.bg};border-radius:8px;padding:16px 20px;margin-bottom:20px;">
            <h2 style="color:#1f2937;font-size:18px;margin:0 0 8px;">${subject}</h2>
            <p style="color:#4b5563;line-height:1.6;margin:0;font-size:14px;">${text}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${link || `${appUrl}/my-tasks`}"
               style="display:inline-block;background-color:${c.accent};color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;">
              Acceder a la GED
            </a>
          </div>
          <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
            <p style="color:#9ca3af;font-size:11px;margin:0;text-align:center;">
              Message automatique - Ne pas repondre directement.<br/>
              &copy; ${new Date().getFullYear()} ${brandName}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ─── Configuration d'envoi ────────────────────────────────────────────────────
// Réglages du tenant (Paramètres › Messagerie) s'il en a enregistré, sinon
// configuration du serveur (.env : SMTP_*, WORKFLOW_ENABLE_NOTIFICATIONS).

// Délais maximum : un serveur de messagerie en panne ne doit pas bloquer
// longtemps les requêtes qui envoient un e-mail (validation, transmission…).
const TIMEOUTS = { connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000 };

export function transportOptions({ host, port, security, username, password }) {
  const opts = { host, port: Number(port) || (security === 'ssl' ? 465 : 587), ...TIMEOUTS };
  if (security === 'ssl') opts.secure = true;
  else if (security === 'none') { opts.secure = false; opts.ignoreTLS = true; }
  else { opts.secure = false; opts.requireTLS = true; }
  if (username) opts.auth = { user: username, pass: password || '' };
  return opts;
}

const tenantBrand = (tenant) => ({
  name: tenant?.name || 'GED',
  appUrl: tenant?.domain ? `https://${tenant.domain}` : (process.env.APP_URL || null),
});

function serverConfig(tenant) {
  if (process.env.WORKFLOW_ENABLE_NOTIFICATIONS === 'false') return { mode: 'disabled', source: 'server', brand: tenantBrand(tenant) };
  const brand = tenantBrand(tenant);
  return {
    mode: 'send', source: 'server', brand, cacheKey: 'server',
    transport: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      ...TIMEOUTS,
    },
    from: `"${tenant ? `GED ${tenant.name}` : 'GED'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
  };
}

// Configuration à utiliser pour un tenant (null = celle du serveur)
export async function resolveMailConfig(tenantId, { useServerConfig = false } = {}) {
  const tenant = tenantId ? await Tenant.findByPk(tenantId) : null;
  if (useServerConfig || !tenantId) return serverConfig(tenant);
  const settings = await TenantMailSettings.findOne({ where: { tenantId } });
  if (!settings) return serverConfig(tenant);

  const brand = tenantBrand(tenant);
  if (!settings.enabled) return { mode: 'disabled', source: 'tenant', brand, settings };
  const password = decryptSecret(settings.passwordEncrypted);
  if (!settings.host || (settings.username && password === null)) {
    return { mode: 'invalid', source: 'tenant', brand, settings,
      error: !settings.host ? 'Serveur de messagerie non renseigné.' : 'Mot de passe illisible : il doit être ressaisi.' };
  }
  const sender = settings.fromEmail || settings.username;
  return {
    mode: 'send', source: 'tenant', brand, settings,
    cacheKey: `${tenantId}:${new Date(settings.updatedAt).getTime()}`,
    transport: transportOptions({ ...settings.get(), password }),
    from: `"${(settings.fromName || `GED ${brand.name}`).replace(/"/g, '')}" <${sender}>`,
    replyTo: settings.replyTo || undefined,
  };
}

// Un transporteur par configuration, réutilisé (connexion non renégociée à chaque e-mail)
const transporters = new Map();
function transporterFor(config) {
  let t = transporters.get(config.cacheKey);
  if (!t) {
    for (const [k, old] of transporters) {
      if (k.split(':')[0] === config.cacheKey.split(':')[0]) { old.close?.(); transporters.delete(k); }
    }
    t = nodemailer.createTransport(config.transport);
    transporters.set(config.cacheKey, t);
  }
  return t;
}

// Message compréhensible pour l'écran de réglage
export function describeMailError(err) {
  const msg = err?.message || String(err);
  if (err?.code === 'EAUTH' || /\b535\b|Invalid login|Username and Password not accepted/i.test(msg)) {
    return "Identifiant ou mot de passe refusé par le serveur de messagerie. Avec Gmail, utilisez un « mot de passe d'application » (et non le mot de passe du compte).";
  }
  if (/wrong version number|ssl3_get_record|EPROTO/i.test(msg)) {
    return 'Le type de sécurité ne correspond pas au port : SSL va avec le port 465, STARTTLS avec le port 587.';
  }
  if (['ENOTFOUND', 'EDNS'].includes(err?.code) || /getaddrinfo/i.test(msg)) return 'Serveur de messagerie introuvable : vérifiez son adresse.';
  if (['ETIMEDOUT', 'ECONNECTION', 'ECONNREFUSED', 'ESOCKET'].includes(err?.code) || /timeout|ECONNREFUSED/i.test(msg)) {
    return 'Serveur de messagerie injoignable (port fermé, pare-feu ou pas d\'accès Internet).';
  }
  if (/STARTTLS/i.test(msg)) return "Ce serveur ne propose pas STARTTLS : choisissez « SSL » (port 465) ou « Aucune ».";
  return msg;
}

async function recordResult(config, ok, error) {
  if (config.source !== 'tenant' || !config.settings) return;
  const fields = ok ? { lastSentAt: new Date() } : { lastErrorAt: new Date(), lastError: String(error).slice(0, 1000) };
  // silent : ne pas modifier updatedAt (clé du cache des transporteurs)
  await TenantMailSettings.update(fields, { where: { id: config.settings.id }, silent: true }).catch(() => {});
}

/**
 * Envoie un e-mail de notification avec la messagerie du tenant courant.
 * @param {object} [options] tenantId (sinon celui de la requête en cours),
 *   useServerConfig (e-mails de la plateforme, ex. bienvenue d'un nouveau client)
 */
export const sendNotificationEmail = async (to, subject, text, type = 'default', link = null, options = {}) => {
  let config;
  try {
    const tenantId = options.tenantId ?? tenantNamespace.get('tenantId') ?? null;
    config = await resolveMailConfig(tenantId, options);

    if (config.mode === 'disabled') {
      console.log('📧 [EMAIL SIMULÉ] ─────────────────────');
      console.log(`À: ${to}`);
      console.log(`Sujet: ${subject}`);
      console.log(`Message: ${text}`);
      console.log('──────────────────────────────────────');
      // simulated : rien n'est parti (utile quand l'envoi doit être réel, ex. code 2FA)
      return { success: true, simulated: true, messageId: 'simulated-' + Date.now() };
    }
    if (config.mode === 'invalid') throw new Error(config.error);

    const info = await transporterFor(config).sendMail({
      from: config.from,
      replyTo: config.replyTo,
      to,
      subject,
      text,
      html: getEmailHTML(subject, text, type, link, config.brand),
    });
    console.log(`✅ Email envoyé (${config.source}) à ${to} : ${subject}`);
    await recordResult(config, true);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error.message);
    if (config) await recordResult(config, false, describeMailError(error));
    // Ne pas bloquer le processus si l'email échoue
    return { success: false, error: error.message };
  }
};

/**
 * E-mail de test avec une configuration donnée (réglages en cours de saisie ou
 * enregistrés). Lève une erreur au message compréhensible en cas d'échec.
 */
export async function sendTestEmail({ transport, from, replyTo, to, brand }) {
  const transporter = nodemailer.createTransport(transport);
  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from, replyTo, to,
      subject: `Test de la messagerie — ${brand.name}`,
      text: `Cet e-mail confirme que la messagerie de la GED (${brand.name}) est correctement configurée. Les notifications (tâches de validation, documents reçus…) partiront avec ces réglages.`,
      html: getEmailHTML(
        'Messagerie configurée',
        `Cet e-mail confirme que la messagerie de la GED (${brand.name}) est correctement configurée.<br/>Les notifications (tâches de validation, documents reçus…) partiront avec ces réglages.`,
        'approved', null, brand,
      ),
    });
    return info.messageId;
  } catch (err) {
    const e = new Error(describeMailError(err));
    e.raw = err.message;
    throw e;
  } finally {
    transporter.close?.();
  }
}

export default { sendNotificationEmail, sendTestEmail };
