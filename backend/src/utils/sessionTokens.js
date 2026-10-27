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
import jwt from 'jsonwebtoken';

const ALGORITHMS = ['HS256'];

export function signSessionToken(user, expiresIn, { remember = false } = {}) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, type: 'session', tv: user.tokenVersion || 0, ...(remember ? { rem: true } : {}) },
    process.env.JWT_SECRET,
    { expiresIn, algorithm: 'HS256' },
  );
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

/** Raison du refus de la session pour ce compte, ou null si elle est valable. */
export function sessionRejection(user, decoded) {
  if (!user) return 'Utilisateur non trouvé';
  if (user.isActive === false) return 'Compte désactivé';
  if ((decoded.tv || 0) !== (user.tokenVersion || 0)) return 'Session expirée';
  return null;
}

/**
 * Invalide toutes les sessions du compte (à sauvegarder par l'appelant) et
 * déconnecte ses connexions temps réel.
 */
export async function revokeSessions(user) {
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  try {
    const { getIO } = await import('./socketManager.js');
    getIO()?.in(`user:${user.id}`).disconnectSockets(true);
  } catch { /* temps réel indisponible : sans effet sur la révocation */ }
}
