// backend/src/services/fcmService.js
// Notifications push vers l'application Android (Firebase Cloud Messaging).
//
// Clé du compte de service Firebase (projet « ged-hsjm ») :
//   FIREBASE_SERVICE_ACCOUNT_FILE  chemin du fichier JSON (par défaut
//                                  /app/secrets/firebase-service-account.json,
//                                  monté depuis ./secrets par docker-compose)
//   FIREBASE_SERVICE_ACCOUNT       ou le contenu JSON lui-même
// Sans clé, les notifications Android sont simplement désactivées.

import fs from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const FICHIER_DEFAUT = '/app/secrets/firebase-service-account.json';

let messaging = null;
let initialise = false;

const lireCompteService = (env = process.env) => {
  if (env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const fichier = env.FIREBASE_SERVICE_ACCOUNT_FILE || FICHIER_DEFAUT;
  if (!fs.existsSync(fichier)) return null;
  return JSON.parse(fs.readFileSync(fichier, 'utf8'));
};

const obtenirMessaging = () => {
  if (initialise) return messaging;
  initialise = true;
  try {
    const compte = lireCompteService();
    if (!compte) {
      console.warn('⚠️  Clé Firebase absente - notifications Android désactivées');
      return null;
    }
    const app = initializeApp({ credential: cert(compte) }, 'ged-fcm');
    messaging = getMessaging(app);
    console.log(`✅ Firebase Cloud Messaging configuré (projet ${compte.project_id})`);
  } catch (e) {
    console.error('❌ Configuration Firebase invalide :', e.message);
  }
  return messaging;
};

export const fcmActif = () => !!obtenirMessaging();

// Codes d'erreur signifiant que le jeton n'est plus valable (appli désinstallée…)
const JETON_INVALIDE = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/**
 * Envoie un message « data » à un téléphone. L'APK construit la notification
 * (GedMessagingService.java), appli ouverte ou fermée.
 * @returns {{ ok: boolean, jetonInvalide?: boolean, erreur?: string }}
 */
export const envoyerFcm = async (jeton, payload) => {
  const m = obtenirMessaging();
  if (!m) return { ok: false, erreur: 'FCM non configuré' };
  const texte = (v) => (v == null ? '' : String(v));
  try {
    await m.send({
      token: jeton,
      data: {
        title: texte(payload?.title),
        body: texte(payload?.body),
        url: texte(payload?.data?.url || payload?.url || '/'),
        tag: texte(payload?.tag || payload?.type || ''),
        type: texte(payload?.type || ''),
      },
      android: { priority: 'high', ttl: 24 * 3600 * 1000 },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, jetonInvalide: JETON_INVALIDE.has(e?.code), erreur: e?.message || String(e) };
  }
};
