// frontend/src/components/NotificationDebug.jsx
import { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  checkPushSubscription
} from '../utils/pushNotificationHelper';
import { getSocket } from '../services/api';

export default function NotificationDebug() {
  const [status, setStatus] = useState({
    notificationPermission: 'default',
    serviceWorkerStatus: 'checking',
    socketConnected: false,
    pushSubscribed: false,
    pushSupported: false
  });

  const checkStatus = async () => {
    const notificationPermission = 'Notification' in window ? Notification.permission : 'unsupported';

    let serviceWorkerStatus = 'not-supported';
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          if (registration.active) serviceWorkerStatus = 'active';
          else if (registration.installing) serviceWorkerStatus = 'installing';
          else if (registration.waiting) serviceWorkerStatus = 'waiting';
        } else {
          serviceWorkerStatus = 'not-registered';
        }
      } catch {
        serviceWorkerStatus = 'error';
      }
    }

    const socket = getSocket();
    const socketConnected = socket?.connected || false;
    const pushSupported = isPushSupported();
    const pushSubscribed = await checkPushSubscription();

    setStatus({ notificationPermission, serviceWorkerStatus, socketConnected, pushSubscribed, pushSupported });
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      await Notification.requestPermission();
      await checkStatus();
    } catch (error) {
      console.error('Erreur permission:', error);
    }
  };

  const handleSubscribePush = async () => {
    try {
      await subscribeToPush();
      await checkStatus();
      alert('✅ Souscription push réussie !');
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  const handleUnsubscribePush = async () => {
    try {
      await unsubscribeFromPush();
      await checkStatus();
      alert('✅ Désinscription réussie !');
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  const handleTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🧪 Test de notification', {
        body: 'Ceci est une notification de test',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
    } else {
      alert('Permission de notification requise !');
    }
  };

  const StatusIcon = ({ condition }) =>
    condition
      ? <CheckCircle size={20} style={{ color: 'var(--success)' }} />
      : <XCircle size={20} style={{ color: 'var(--danger)' }} />;

  const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
  const labelStyle = { fontSize: 13, color: 'var(--fg)' };
  const monoStyle = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' };

  const btnBase = {
    width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 500,
    borderRadius: 'var(--radius-2)', border: 'none', cursor: 'pointer', color: '#fff',
    transition: 'opacity .15s',
  };

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)',
      padding: 16, maxWidth: 384, zIndex: 9999, width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Bell size={18} style={{ color: 'var(--brand)' }} />
        <h3 style={{ fontWeight: 700, color: 'var(--fg)', fontSize: 14, margin: 0 }}>Diagnostic Notifications</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'Permission Notification:', value: status.notificationPermission, ok: status.notificationPermission === 'granted' },
          { label: 'Service Worker:', value: status.serviceWorkerStatus, ok: status.serviceWorkerStatus === 'active' },
          { label: 'Socket.IO:', value: status.socketConnected ? 'connecté' : 'déconnecté', ok: status.socketConnected },
          { label: 'Push supporté:', value: status.pushSupported ? 'oui' : 'non', ok: status.pushSupported },
          { label: 'Push souscrit:', value: status.pushSubscribed ? 'oui' : 'non', ok: status.pushSubscribed },
        ].map(({ label, value, ok }) => (
          <div key={label} style={rowStyle}>
            <span style={labelStyle}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusIcon condition={ok} />
              <span style={monoStyle}>{value}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {status.notificationPermission !== 'granted' && (
          <button onClick={handleRequestPermission} style={{ ...btnBase, background: 'var(--brand)' }}>
            Demander permission
          </button>
        )}
        {status.notificationPermission === 'granted' && !status.pushSubscribed && (
          <button onClick={handleSubscribePush} style={{ ...btnBase, background: 'var(--success)' }}>
            Souscrire au Push
          </button>
        )}
        {status.pushSubscribed && (
          <button onClick={handleUnsubscribePush} style={{ ...btnBase, background: 'var(--danger)' }}>
            Se désinscrire
          </button>
        )}
        <button onClick={handleTestNotification} style={{ ...btnBase, background: '#7c3aed' }}>
          Tester notification
        </button>
        <button onClick={checkStatus} style={{ ...btnBase, background: 'var(--fg-muted)' }}>
          Actualiser
        </button>
      </div>

      {status.serviceWorkerStatus !== 'active' && (
        <div style={{
          marginTop: 12, padding: 8, borderRadius: 'var(--radius-2)',
          background: 'var(--warning-soft)', border: '1px solid var(--warning)',
          fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <AlertCircle size={14} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: 'var(--fg)' }}>Le Service Worker n'est pas actif. Rechargez la page.</span>
        </div>
      )}
    </div>
  );
}
