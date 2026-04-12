// frontend/src/pages/NotificationSettings.jsx

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Info, Loader2, RefreshCw } from 'lucide-react';
import useNotifications from '../hooks/useNotifications';
import { 
  subscribeToPush, 
  unsubscribeFromPush, 
  checkPushSubscription 
} from '../utils/pushNotificationHelper';
import { getSocket } from '../services/api';
import toast from 'react-hot-toast';

export default function NotificationSettings() {
  const { 
    notificationsEnabled,
    pushSupported,
    requestNotificationPermission 
  } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);

  // Vérifier l'état des notifications
  const checkStatus = async () => {
    // Vérifier Push
    const isPushSubscribed = await checkPushSubscription();
    setPushSubscribed(isPushSubscribed);

    // Vérifier Socket.IO
    const socket = getSocket();
    setSocketConnected(socket?.connected || false);

    // Vérifier Service Worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      setServiceWorkerActive(registration?.active !== undefined);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Activer les notifications navigateur
  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        await checkStatus();
      }
    } catch (error) {
      console.error('Erreur activation notifications:', error);
      toast.error('Erreur lors de l\'activation des notifications');
    } finally {
      setLoading(false);
    }
  };

  // Activer/Désactiver Push
  const handleTogglePush = async () => {
    setLoading(true);
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush();
        toast.success('Notifications Push désactivées');
      } else {
        await subscribeToPush();
        toast.success('Notifications Push activées !');
      }
      await checkStatus();
    } catch (error) {
      console.error('Erreur Push:', error);
      toast.error('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Tester une notification
  const handleTestNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('🧪 Test de notification', {
        body: 'Si vous voyez ceci, les notifications fonctionnent !',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
    } else {
      toast('Veuillez d\'abord activer les notifications', { icon: '⚠️' });
    }
  };

  const StatusBadge = ({ active, label }) => (
    <div className="flex items-center gap-2">
      {active ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <XCircle className="w-5 h-5 text-gray-400" />
      )}
      <span className={`text-sm ${active ? 'text-green-700 dark:text-green-400' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* En-tête */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Bell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Paramètres de notification
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gérez vos préférences de notification
              </p>
            </div>
          </div>

          {/* État du système */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <StatusBadge 
              active={socketConnected} 
              label={socketConnected ? 'Connecté en temps réel' : 'Déconnecté'} 
            />
            <StatusBadge 
              active={serviceWorkerActive} 
              label={serviceWorkerActive ? 'Service Worker actif' : 'Service Worker inactif'} 
            />
            <StatusBadge 
              active={pushSubscribed} 
              label={pushSubscribed ? 'Push activé' : 'Push désactivé'} 
            />
          </div>
        </div>

        {/* Section 1 : Notifications navigateur */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <Bell className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Notifications navigateur
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Recevez des alertes sonores et visuelles quand l'application est ouverte.
                Indispensable pour être notifié des nouvelles tâches en temps réel.
              </p>

              {notificationsEnabled ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Notifications activées ✓
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleEnableNotifications}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Activation...
                    </>
                  ) : (
                    <>
                      <Bell className="w-5 h-5" />
                      Activer les notifications
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 2 : Notifications Push */}
        {pushSupported && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Notifications Push (Hors ligne)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Recevez des notifications même quand l'application est fermée ou que vous êtes sur un autre onglet.
                  Idéal pour ne jamais manquer une tâche urgente.
                </p>

                {!notificationsEnabled ? (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Activez d'abord les notifications navigateur
                    </p>
                  </div>
                ) : (
                  <>
                    {pushSubscribed ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            Notifications Push activées ✓
                          </span>
                        </div>
                        <button
                          onClick={handleTogglePush}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Désactivation...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5" />
                              Désactiver les Push
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleTogglePush}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Activation...
                          </>
                        ) : (
                          <>
                            <Bell className="w-5 h-5" />
                            Activer les notifications Push
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 3 : Test */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <RefreshCw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Tester les notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Envoyez-vous une notification de test pour vérifier que tout fonctionne correctement.
              </p>
              <button
                onClick={handleTestNotification}
                disabled={!notificationsEnabled}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Bell className="w-5 h-5" />
                Envoyer une notification test
              </button>
            </div>
          </div>
        </div>

        {/* Section 4 : Informations */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                À propos des notifications
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>Vous recevrez des notifications pour toutes les nouvelles tâches qui vous sont assignées</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>Les notifications en temps réel (Socket.IO) fonctionnent quand l'application est ouverte</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>Les notifications Push vous alertent même quand l'application est fermée</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>Vous pouvez désactiver les notifications à tout moment depuis cette page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>Un son d'alerte accompagne chaque notification</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}