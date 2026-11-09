// frontend/src/utils/androidApp.js
import toast from 'react-hot-toast';

// Détection de l'application Android (APK Capacitor, cf. docs/application-android.md).
// L'APK ajoute « GEDHSJM-Android » à son user-agent (capacitor.config.json).

export const isAndroidApp = () =>
  typeof navigator !== 'undefined' && /GEDHSJM-Android/.test(navigator.userAgent || '');

// Retour à la page locale de l'APK pour choisir un autre serveur GED.
// https://localhost est l'adresse des pages embarquées dans l'APK (capacitor-shell/).
export const changerServeurGed = () => {
  window.location.href = 'https://localhost/?changer=1';
};

// ── Téléchargements dans l'APK ──────────────────────────────────────────────
// La WebView Android ignore les liens <a download> (blob:, data: ou http).
// Dans l'APK, on les intercepte et on transmet le fichier au pont natif
// « GedAndroid » (android/.../GedFichiers.java), qui l'enregistre dans
// Téléchargements puis propose de l'ouvrir. Couvre toute l'application :
// documents, exports Excel, PDF générés (jsPDF), pièces jointes du chat…

const pontFichiers = () =>
  (typeof window !== 'undefined' && window.GedAndroid && typeof window.GedAndroid.enregistrer === 'function')
    ? window.GedAndroid : null;

const blobVersBase64 = (blob) => new Promise((resolve, reject) => {
  const lecteur = new FileReader();
  lecteur.onload = () => resolve(String(lecteur.result).split(',')[1] || '');
  lecteur.onerror = () => reject(lecteur.error);
  lecteur.readAsDataURL(blob);
});

const nomDepuisUrl = (url) => {
  try {
    const dernier = new URL(url, window.location.href).pathname.split('/').filter(Boolean).pop();
    return dernier ? decodeURIComponent(dernier) : 'document';
  } catch { return 'document'; }
};

export const installerTelechargementsAndroid = () => {
  if (!isAndroidApp() || !pontFichiers() || window.__gedTelechargements) return;
  window.__gedTelechargements = true;

  // Les blobs sont souvent révoqués juste après a.click() : on garde une
  // référence pour pouvoir les lire après coup.
  const blobs = new Map();
  const creer = URL.createObjectURL.bind(URL);
  const revoquer = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (obj) => {
    const url = creer(obj);
    if (obj instanceof Blob) blobs.set(url, obj);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    setTimeout(() => { blobs.delete(url); revoquer(url); }, 60000);
  };

  const envoyer = async (href, nom) => {
    try {
      const blob = blobs.get(href)
        || await fetch(href, { credentials: 'include' }).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.blob();
        });
      const base64 = await blobVersBase64(blob);
      pontFichiers().enregistrer(base64, nom, blob.type || '');
    } catch (e) {
      console.error('[APK] Téléchargement impossible', e);
      toast.error('Téléchargement impossible.');
    }
  };

  // Vrai si le lien est un téléchargement pris en charge ici.
  const intercepter = (a) => {
    if (!a || typeof a.hasAttribute !== 'function' || !a.hasAttribute('download')) return false;
    const href = a.href;
    if (!href || href.startsWith('javascript:')) return false;
    envoyer(href, a.getAttribute('download') || nomDepuisUrl(href));
    return true;
  };

  const clicOrigine = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!intercepter(this)) clicOrigine.call(this);
  };
  const dispatchOrigine = HTMLAnchorElement.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.dispatchEvent = function (ev) {
    if (ev && ev.type === 'click' && intercepter(this)) return false;
    return dispatchOrigine.call(this, ev);
  };
  // Liens <a download> présents dans les pages et touchés par l'utilisateur.
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
    if (a && intercepter(a)) e.preventDefault();
  }, true);
};

// ── Notifications dans l'APK (Firebase Cloud Messaging) ─────────────────────
// Le jeton Firebase du téléphone est fourni par le pont natif (GedFichiers.jetonPush)
// puis enregistré sur le serveur pour le compte connecté (/api/push/fcm-subscribe).
// Le Web Push du navigateur n'existe pas dans la WebView Android.

const API = import.meta.env.VITE_API_URL || '/api';

const lireJeton = () => {
  try { return (pontFichiers() && typeof window.GedAndroid.jetonPush === 'function' && window.GedAndroid.jetonPush()) || ''; }
  catch { return ''; }
};

const appelPush = (route, jetonSession, jetonPush) =>
  fetch(`${API}/push/${route}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jetonSession}` },
    body: JSON.stringify({ token: jetonPush }),
  });

// Le jeton Firebase peut arriver quelques secondes après le 1er lancement.
export const enregistrerNotificationsAndroid = (jetonSession, essai = 0) => {
  if (!isAndroidApp() || !jetonSession) return;
  const jeton = lireJeton();
  if (!jeton) {
    if (essai < 10) setTimeout(() => enregistrerNotificationsAndroid(jetonSession, essai + 1), 3000);
    return;
  }
  appelPush('fcm-subscribe', jetonSession, jeton).catch(() => {});
};

// À la déconnexion : ce téléphone ne reçoit plus les notifications du compte.
export const retirerNotificationsAndroid = (jetonSession) => {
  const jeton = isAndroidApp() ? lireJeton() : '';
  if (!jeton || !jetonSession) return;
  appelPush('fcm-unsubscribe', jetonSession, jeton).catch(() => {});
};
