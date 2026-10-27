// backend/src/utils/sessionTokens.js
// Jetons de session : une seule façon de les émettre et de les vérifier, pour
// l'API (protect), le super-admin et le temps réel (Socket.IO).
//  - Un jeton de session porte type 'session'. Tout autre type (ex. le jeton
//    provisoire '2fa_pending', émis après le seul mot de passe) est refusé.
//    Les jetons émis avant ce typage n'ont pas de type : encore acceptés.
//  - tv (version des jetons) doit égaler users.token_version : l'incrémenter
//    invalide toutes les sessions du compte.
//  - Un compte désactivé (isActive = false) est refusé.
//  - rem : session « Rester connecté sur cet appareil » (plus longue, sans
//    déconnexion pour inactivité dans le navigateur).
//  - sid : appareil connecté (table user_sessions). Une session déconnectée à
//    distance (revokedAt) est refusée. Les jetons émis avant les appareils
//    connectés n'ont pas de sid : encore acceptés jusqu'à leur expiration.
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import UserSession from '../models/UserSession.js';
import { clientIp } from './deviceLabel.js';

const ALGORITHMS = ['HS256'];
// Dernière activité d'un appareil : enregistrée au plus toutes les 5 minutes
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
// Sessions expirées ou déconnectées : gardées 30 jours puis effacées
const PURGE_AFTER_MS = 30 * 86400 * 1000;

export function signSessionToken(user, expiresIn, { remember = false, sid } = {}) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, type: 'session', tv: user.tokenVersion || 0, ...(remember ? { rem: true } : {}), ...(sid ? { sid } : {}) },
    process.env.JWT_SECRET,
    { expiresIn, algorithm: 'HS256' },
  );
}

/**
 * Appareil de la session : `sid` existant (nouveau jeton pour le même appareil,
 * ex. après un changement de mot de passe) ou nouvelle ligne pour cette
 * connexion. Renvoie le sid, ou undefined sans requête ni sid.
 */
export async function recordDeviceSession(user, { req, sid, remember, days }) {
  const expiresAt = new Date(Date.now() + days * 86400 * 1000);
  if (sid) {
    await UserSession.update({ expiresAt, remember }, { where: { id: sid, userId: user.id } });
    return sid;
  }
  if (!req) return undefined;
  const old = new Date(Date.now() - PURGE_AFTER_MS);
  await UserSession.destroy({ where: { userId: user.id, [Op.or]: [{ expiresAt: { [Op.lt]: old } }, { revokedAt: { [Op.lt]: old } }] } });
  const row = await UserSession.create({
    userId: user.id, remember, ip: clientIp(req),
    userAgent: String(req.headers?.['user-agent'] || '').slice(0, 500) || null,
    lastSeenAt: new Date(), expiresAt,
  });
  return row.id;
}

/** Vérifie signature, expiration et type ; lève une erreur sinon. */
export function verifySessionToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ALGORITHMS });
  if (decoded.type !== undefined && decoded.type !== 'session') {
    const err = new Error('Jeton non valable comme session');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return decoded;
}

/**
 * Raison du refus de la session pour ce compte, ou null si elle est valable.
 * Enregistre aussi la dernière activité de l'appareil (et son IP si `req`).
 */
export async function sessionRejection(user, decoded, req) {
  if (!user) return 'Utilisateur non trouvé';
  if (user.isActive === false) return 'Compte désactivé';
  if ((decoded.tv || 0) !== (user.tokenVersion || 0)) return 'Session expirée';
  if (decoded.sid) {
    const row = await UserSession.findByPk(decoded.sid);
    if (!row || row.userId !== user.id || row.revokedAt) return 'Session expirée';
    if (Date.now() - new Date(row.lastSeenAt).getTime() > TOUCH_INTERVAL_MS) {
      const ip = req ? clientIp(req) : null;
      row.update({ lastSeenAt: new Date(), ...(ip ? { ip } : {}) }).catch(() => {});
    }
  }
  return null;
}

async function disconnectRealtime(room) {
  try {
    const { getIO } = await import('./socketManager.js');
    getIO()?.in(room).disconnectSockets(true);
  } catch { /* temps réel indisponible : sans effet sur la révocation */ }
}

/**
 * Invalide toutes les sessions du compte (à sauvegarder par l'appelant) et
 * déconnecte ses connexions temps réel. `keepSid` : appareil qui reçoit
 * aussitôt un nouveau jeton (il reste dans la liste des appareils).
 */
export async function revokeSessions(user, { keepSid } = {}) {
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await UserSession.update({ revokedAt: new Date() }, {
    where: { userId: user.id, revokedAt: null, ...(keepSid ? { id: { [Op.ne]: keepSid } } : {}) },
  });
  await disconnectRealtime(`user:${user.id}`);
}

/** Déconnecte un seul appareil (à distance ou à la déconnexion). */
export async function revokeDeviceSession(userId, sid) {
  const [count] = await UserSession.update({ revokedAt: new Date() }, { where: { id: sid, userId, revokedAt: null } });
  if (count) await disconnectRealtime(`session:${sid}`);
  return count > 0;
}
