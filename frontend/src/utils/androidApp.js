// frontend/src/utils/androidApp.js
// Détection de l'application Android (APK Capacitor, cf. docs/application-android.md).
// L'APK ajoute « GEDHSJM-Android » à son user-agent (capacitor.config.json).

export const isAndroidApp = () =>
  typeof navigator !== 'undefined' && /GEDHSJM-Android/.test(navigator.userAgent || '');

// Retour à la page locale de l'APK pour choisir un autre serveur GED.
// https://localhost est l'adresse des pages embarquées dans l'APK (capacitor-shell/).
export const changerServeurGed = () => {
  window.location.href = 'https://localhost/?changer=1';
};
