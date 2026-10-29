// backend/src/utils/qrVerification.js
import crypto from 'crypto';
import QRCode from 'qrcode';

/**
 * Genere un hash de verification unique pour un document signe
 * Le hash encode : documentId + step + validatorId + timestamp
 */
export function generateVerificationHash(documentId, step, validatorId) {
  const payload = `${documentId}:${step}:${validatorId}:${Date.now()}`;
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
}

/**
 * Genere un QR code en tant que buffer PNG
 * @param {string} url - URL de verification
 * @returns {Promise<Buffer>} Buffer PNG du QR code
 */
export async function generateQRCodeBuffer(url) {
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 80,
    margin: 1,
    color: {
      dark: '#1f2937',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

// Nom de domaine utilisable dans un QR (pas localhost ni une adresse IP)
const isPublicHost = (host) => !!host && !/^(localhost|127\.|\d{1,3}(\.\d{1,3}){3}$|\[?::1\]?$)/i.test(host);

let warnedMissingUrl = false;

/**
 * Adresse de la GED à mettre dans les QR codes : domaine de l'établissement,
 * sinon APP_URL. Jamais localhost en silence : en production, un QR vers
 * localhost est inutilisable une fois scanné par un téléphone.
 */
export async function resolveAppUrl(tenantId) {
  if (tenantId) {
    const { Tenant } = await import('../models/index.js');
    const tenant = await Tenant.findByPk(tenantId, { attributes: ['domain'] });
    if (isPublicHost(tenant?.domain)) return `https://${tenant.domain}`;
  }
  const configured = (process.env.APP_URL || process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production' && !warnedMissingUrl) {
    warnedMissingUrl = true;
    console.error('❌ APP_URL non défini : les QR de vérification pointeront vers localhost. Définir APP_URL (ex. https://ged.hsjmcam.net).');
  }
  return 'http://localhost:3001';
}

/**
 * Construit l'URL de verification publique
 */
export function buildVerificationUrl(hash, baseUrl) {
  return `${baseUrl}/verify/${hash}`;
}
