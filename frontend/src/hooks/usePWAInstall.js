import { useState, useEffect } from 'react';

/**
 * Gère le prompt d'installation PWA (bouton "Installer l'app")
 * isInstallable : true si le navigateur propose l'installation
 * isInstalled   : true si l'app tourne déjà en mode standalone
 * install()     : déclenche le prompt natif du navigateur
 */
export default function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable]   = useState(false);
  const [isInstalled, setIsInstalled]       = useState(false);

  useEffect(() => {
    // Déjà installée si lancée en standalone (depuis l'écran d'accueil)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    const handler = (e) => {
      e.preventDefault(); // Empêcher l'affichage automatique
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Détecter si l'utilisateur installe via le prompt natif
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  };

  return { isInstallable, isInstalled, install };
}
