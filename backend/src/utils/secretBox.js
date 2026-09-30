// backend/src/utils/secretBox.js
// Chiffrement des secrets stockés en base (ex. mot de passe SMTP d'un tenant) :
// AES-256-GCM, format « v1:<iv>:<tag>:<données> » en base64.
//
// Clé : SETTINGS_ENCRYPTION_KEY (.env) si définie, sinon dérivée de JWT_SECRET.
// Changer cette clé rend les secrets déjà enregistrés illisibles : il faut
// alors les ressaisir (decryptSecret renvoie null, l'écran le signale).
import crypto from 'crypto';

const PREFIX = 'v1';

function key() {
  const source = process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) throw new Error('Aucune clé de chiffrement : définir SETTINGS_ENCRYPTION_KEY ou JWT_SECRET.');
  return crypto.createHash('sha256').update(`ged-settings:${source}`).digest();
}

export function encryptSecret(plain) {
  if (plain === null || plain === undefined || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [PREFIX, iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

// null si absent, illisible ou chiffré avec une autre clé
export function decryptSecret(stored) {
  if (!stored) return null;
  try {
    const [prefix, iv, tag, data] = stored.split(':');
    if (prefix !== PREFIX) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
