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

  // ❌ SUPPRIMER CES LIGNES
  // const { user } = useAuth();
  // const isValidator = user?.role === 'validator' || user?.role === 'admin';

  const checkStatus = async () => {
    const notificationPermission = Notification.permission;
    
    let serviceWorkerStatus = 'not-supported';
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          if (registration.active) {
            serviceWorkerStatus = 'active';
          } else if (registration.installing) {
            serviceWorkerStatus = 'installing';
          } else if (registration.waiting) {
            serviceWorkerStatus = 'waiting';
          }
        } else {
          serviceWorkerStatus = 'not-registered';
        }
      } catch (error) {
        serviceWorkerStatus = 'error';
      }
    }
    
    const socket = getSocket();
    const socketConnected = socket?.connected || false;
    
    const pushSupported = isPushSupported();
    const pushSubscribed = await checkPushSubscription();
    
    setStatus({
      notificationPermission,
      serviceWorkerStatus,
      socketConnected,
      pushSubscribed,
      pushSupported
    });
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      console.log('Permission:', permission);
      await checkStatus();
    } catch (error) {
      console.error('Erreur permission:', error);
    }
  };

  const handleSubscribePush = async () => {
    // ❌ SUPPRIMER CETTE CONDITION
    // if (!isValidator) {
    //   alert('❌ Les notifications Push sont réservées aux validateurs');
    //   return;
    // }

    try {
      console.log('📬 Souscription push...');
      await subscribeToPush();
      await checkStatus();
      alert('✅ Souscription push réussie !');
    } catch (error) {
      console.error('❌ Erreur souscription:', error);
      alert('❌ Erreur: ' + error.message);
    }
  };

  const handleUnsubscribePush = async () => {
    try {
      await unsubscribeFromPush();
      await checkStatus();
      alert('✅ Désinscription réussie !');
    } catch (error) {
      console.error('❌ Erreur désinscription:', error);
      alert('❌ Erreur: ' + error.message);
    }
  };

  const handleTestNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('🧪 Test de notification', {
        body: 'Ceci est une notification de test',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
    } else {
      alert('Permission de notification requise !');
    }
  };

  const StatusIcon = ({ condition }) => {
    if (condition) return <CheckCircle className="text-green-500" size={20} />;
    return <XCircle className="text-red-500" size={20} />;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-md z-50">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="text-blue-600" />
        <h3 className="font-bold text-gray-900 dark:text-white">Diagnostic Notifications</h3>
      </div>

      {/* ❌ SUPPRIMER LE BADGE DE RÔLE */}

      <div className="space-y-2 text-sm">
        {/* Permission */}
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">Permission Notification:</span>
          <div className="flex items-center gap-2">
            <StatusIcon condition={status.notificationPermission === 'granted'} />
            <span className="font-mono text-xs">{status.notificationPermission}</span>
          </div>
        </div>

        {/* Service Worker */}
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">Service Worker:</span>
          <div className="flex items-center gap-2">
            <StatusIcon condition={status.serviceWorkerStatus === 'active'} />
            <span className="font-mono text-xs">{status.serviceWorkerStatus}</span>
          </div>
        </div>

        {/* Socket.IO */}
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">Socket.IO:</span>
          <div className="flex items-center gap-2">
            <StatusIcon condition={status.socketConnected} />
            <span className="font-mono text-xs">{status.socketConnected ? 'connecté' : 'déconnecté'}</span>
          </div>
        </div>

        {/* Push Support */}
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">Push supporté:</span>
          <div className="flex items-center gap-2">
            <StatusIcon condition={status.pushSupported} />
            <span className="font-mono text-xs">{status.pushSupported ? 'oui' : 'non'}</span>
          </div>
        </div>

        {/* Push Subscribed */}
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">Push souscrit:</span>
          <div className="flex items-center gap-2">
            <StatusIcon condition={status.pushSubscribed} />
            <span className="font-mono text-xs">{status.pushSubscribed ? 'oui' : 'non'}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {status.notificationPermission !== 'granted' && (
          <button
            onClick={handleRequestPermission}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Demander permission
          </button>
        )}

        {status.notificationPermission === 'granted' && !status.pushSubscribed && (
          <button
            onClick={handleSubscribePush}
            className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Souscrire au Push
          </button>
        )}

        {status.pushSubscribed && (
          <button
            onClick={handleUnsubscribePush}
            className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Se désinscrire
          </button>
        )}

        <button
          onClick={handleTestNotification}
          className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
        >
          Tester notification
        </button>

        <button
          onClick={checkStatus}
          className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
        >
          Actualiser
        </button>
      </div>

      {/* Aide */}
      {status.serviceWorkerStatus !== 'active' && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-xs">
          <AlertCircle size={14} className="inline mr-1" />
          Le Service Worker n'est pas actif. Rechargez la page.
        </div>
      )}
    </div>
  );
}