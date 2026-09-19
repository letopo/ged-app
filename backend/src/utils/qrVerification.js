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

/**
 * Construit l'URL de verification publique
 */
export function buildVerificationUrl(hash) {
  const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
  return `${baseUrl}/verify/${hash}`;
}
