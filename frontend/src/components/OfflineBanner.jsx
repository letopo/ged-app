import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, Download, Server } from 'lucide-react';
import useOnlineStatus from '../hooks/useOnlineStatus';
import usePWAInstall from '../hooks/usePWAInstall';

export default function OfflineBanner() {
  const status = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // isOnline peut être boolean ou objet selon l'usage — compatibilité
  const isOnline    = typeof status === 'object' ? status.isOnline    : status;
  const isServerUp  = typeof status === 'object' ? status.isServerUp  : status;

  // Afficher "reconnecté" brièvement après un retour en ligne
  const [justReconnected, setJustReconnected] = useState(false);
  useEffect(() => {
    if (isOnline && isServerUp) {
      setJustReconnected(true);
      const t = setTimeout(() => setJustReconnected(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, isServerUp]);

  const isOffline = !isOnline || !isServerUp;

  return (
    <>
      {/* ── Bannière hors-ligne ── */}
      {isOffline && (
        <div
          style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9998 }}
          className="animate-fadeIn"
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 18px', background: 'var(--surface)',
            border: '1.5px solid var(--warning)', borderRadius: 16,
            boxShadow: 'var(--shadow-3)',
          }}>
            {!isOnline
              ? <WifiOff size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              : <Server size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            }
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                {!isOnline ? 'Hors connexion' : 'Serveur inaccessible'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 8 }}>
                {!isOnline
                  ? 'Données en cache disponibles'
                  : 'Vérifiez le WiFi ou le serveur'}
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              title="Réessayer la connexion"
              style={{
                marginLeft: 4, padding: 6, background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--fg-muted)', borderRadius: 'var(--radius-2)',
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Toast "reconnecté" ── */}
      {justReconnected && !isOffline && (
        <div
          style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9998 }}
          className="animate-fadeIn"
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 18px', background: 'var(--surface)',
            border: '1.5px solid var(--success)', borderRadius: 16,
            boxShadow: 'var(--shadow-3)',
          }}>
            <Wifi size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Reconnecté</span>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Synchronisation en cours…</span>
          </div>
        </div>
      )}

      {/* ── Bouton d'installation PWA (affiché une seule fois, en bas à droite) ── */}
      {isInstallable && !isInstalled && (
        <div
          style={{ position: 'fixed', bottom: 72, right: 16, zIndex: 9997 }}
          className="animate-fadeIn"
        >
          <button
            onClick={install}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: 12, cursor: 'pointer',
              boxShadow: 'var(--shadow-3)', fontSize: 13, fontWeight: 600,
            }}
          >
            <Download size={15} />
            Installer l'application
          </button>
        </div>
      )}
    </>
  );
}
