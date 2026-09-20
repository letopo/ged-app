import { useState, useEffect, useRef } from 'react';

/**
 * Retourne l'état réseau de l'appareil.
 * isOnline     : true/false (navigator.onLine + événements)
 * isServerUp   : true/false (ping /api/health toutes les 20s quand online)
 * lastOnlineAt : Date de la dernière connexion confirmée au serveur
 */
export default function useOnlineStatus() {
  const [isOnline, setIsOnline]         = useState(navigator.onLine);
  const [isServerUp, setIsServerUp]     = useState(true);
  const [lastOnlineAt, setLastOnlineAt] = useState(navigator.onLine ? new Date() : null);
  const pingTimer = useRef(null);

  const pingServer = async () => {
    // AbortSignal.timeout() n'est pas supporté sur iOS < 15.4
    // On utilise AbortController + setTimeout à la place
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        setIsServerUp(true);
        setLastOnlineAt(new Date());
      } else {
        setIsServerUp(false);
      }
    } catch {
      clearTimeout(timer);
      setIsServerUp(false);
    }
  };

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      pingServer();
    };
    const goOffline = () => {
      setIsOnline(false);
      setIsServerUp(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Ping périodique toutes les 20s quand online
    pingTimer.current = setInterval(() => {
      if (navigator.onLine) pingServer();
    }, 20000);

    // Premier ping au montage
    if (navigator.onLine) pingServer();

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(pingTimer.current);
    };
  }, []);

  return { isOnline, isServerUp, lastOnlineAt };
}
