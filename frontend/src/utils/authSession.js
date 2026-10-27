// frontend/src/utils/authSession.js
// Expiration de la session (jeton JWT) côté navigateur.
//  - Au démarrage, un jeton expiré resté dans le localStorage est écarté
//    (sinon l'appli se croit connectée et chaque appel API renvoie 401).
//  - Pendant l'utilisation, un 401 « jeton expiré/invalide » renvoyé par le
//    serveur déclenche SESSION_EXPIRED_EVENT, écouté par AuthContext.

export const SESSION_EXPIRED_EVENT = 'auth:session-expired';
// Nouveau jeton rendu après un changement de mot de passe (anciennes sessions révoquées)
export const SESSION_RENEWED_EVENT = 'ged:session-renewed';

// Date d'expiration du jeton en millisecondes, ou null si illisible / sans `exp`.
export function getTokenExpiry(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = JSON.parse(json);
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// Session « Rester connecté sur cet appareil » (marque rem du jeton) : pas de
// déconnexion pour inactivité.
export function isRememberedSession(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).rem === true;
  } catch {
    return false;
  }
}

// Un jeton illisible est considéré comme expiré ; sans `exp`, on laisse le
// serveur trancher. Marge de 30 s pour ne pas démarrer sur un jeton mourant.
export function isTokenExpired(token, marginMs = 30_000) {
  if (!token || token.split('.').length !== 3) return true;
  const expiry = getTokenExpiry(token);
  return expiry !== null && expiry - marginMs <= Date.now();
}

// Étapes de connexion : leurs 401 (mauvais identifiants, code 2FA faux,
// jeton 2FA temporaire périmé) ne concernent pas la session en cours.
const LOGIN_ENDPOINTS = [/\/auth\/login$/, /\/auth\/2fa\/verify-login$/, /\/auth\/register$/, /\/auth\/passkeys\/login\//];

// Messages des middlewares d'authentification (backend/src/middleware/auth.js,
// superadmin.js, utils/sessionTokens.js sessionRejection : « Session expirée »
// après une déconnexion à distance ou un changement de mot de passe, « Compte
// désactivé »). Les autres 401 (ex. « Mot de passe actuel incorrect » dans le
// profil) ne déconnectent pas.
const SESSION_401_MESSAGE = /token|session|compte désactiv|non autoris|non authentifi|utilisateur non trouv/i;

let notified = false;

// Appelé par l'intercepteur axios sur chaque réponse 401.
export function handleUnauthorized(error) {
  const config = error.config || {};
  const url = (config.url || '').split('?')[0];
  const hadToken = Boolean(config.headers?.Authorization);
  const data = error.response?.data || {};
  const message = String(data.message || data.error || '');
  if (!hadToken || LOGIN_ENDPOINTS.some(re => re.test(url))) return;
  if (message && !SESSION_401_MESSAGE.test(message)) return;
  if (notified) return; // plusieurs appels échouent en même temps : un seul avis
  notified = true;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

// Réarmé à chaque nouvelle connexion.
export function resetSessionExpiredNotice() {
  notified = false;
}
