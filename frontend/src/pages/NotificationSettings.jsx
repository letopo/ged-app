// frontend/src/pages/NotificationSettings.jsx

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle, XCircle, Info, Loader2, RefreshCw, Mail } from 'lucide-react';
import useNotifications from '../hooks/useNotifications';
import {
  subscribeToPush,
  unsubscribeFromPush,
  checkPushSubscription
} from '../utils/pushNotificationHelper';
import { getSocket, notificationPrefsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function NotificationSettings() {
  const { t } = useTranslation();
  const {
    notificationsEnabled,
    pushSupported,
    requestNotificationPermission
  } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

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
    loadEmailPrefs();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadEmailPrefs = async () => {
    try {
      const res = await notificationPrefsAPI.get();
      setEmailPrefs(res.data.data);
    } catch (e) {
      console.warn('Preferences non chargees:', e.message);
    }
  };

  const toggleEmailPref = async (key) => {
    if (!emailPrefs) return;
    setSavingPrefs(true);
    try {
      const updated = { ...emailPrefs, [key]: !emailPrefs[key] };
      const res = await notificationPrefsAPI.update(updated);
      setEmailPrefs(res.data.data);
      toast.success(t('Preference mise a jour'));
    } catch (e) {
      toast.error(t('Erreur sauvegarde'));
    } finally {
      setSavingPrefs(false);
    }
  };

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
      toast.error(t("Erreur lors de l'activation des notifications"));
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
        toast.success(t('Notifications Push désactivées'));
      } else {
        await subscribeToPush();
        toast.success(t('Notifications Push activées !'));
      }
      await checkStatus();
    } catch (error) {
      console.error('Erreur Push:', error);
      toast.error(t('Erreur: {{message}}', { message: error.message }));
    } finally {
      setLoading(false);
    }
  };

  // Tester une notification
  const handleTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(t('🧪 Test de notification'), {
        body: t('Si vous voyez ceci, les notifications fonctionnent !'),
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
    } else {
      toast(t("Veuillez d'abord activer les notifications"), { icon: '⚠️' });
    }
  };

  const StatusBadge = ({ active, label }) => (
    <div className="flex items-center gap-2">
      {active ? (
        <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />
      ) : (
        <XCircle className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
      )}
      <span className="text-sm" style={{ color: active ? 'var(--success)' : 'var(--fg-muted)' }}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen py-8" style={{ background: 'var(--surface-2)' }}>
      <div className="max-w-3xl mx-auto px-4">
        {/* En-tête */}
        <div className="rounded-lg p-6 mb-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--brand-soft)' }}>
              <Bell className="w-8 h-8" style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                {t('Paramètres de notification')}
              </h1>
              <p style={{ color: 'var(--fg-muted)' }}>
                {t('Gérez vos préférences de notification')}
              </p>
            </div>
          </div>

          {/* État du système */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg" style={{ background: 'var(--surface-2)' }}>
            <StatusBadge
              active={socketConnected}
              label={socketConnected ? t('Connecté en temps réel') : t('Déconnecté')}
            />
            <StatusBadge
              active={serviceWorkerActive}
              label={serviceWorkerActive ? t('Service Worker actif') : t('Service Worker inactif')}
            />
            <StatusBadge
              active={pushSubscribed}
              label={pushSubscribed ? t('Push activé') : t('Push désactivé')}
            />
          </div>
        </div>

        {/* Section 1 : Notifications navigateur */}
        <div className="rounded-lg p-6 mb-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--success-soft)' }}>
              <Bell className="w-6 h-6" style={{ color: 'var(--success)' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                {t('Notifications navigateur')}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
                {t("Recevez des alertes sonores et visuelles quand l'application est ouverte. Indispensable pour être notifié des nouvelles tâches en temps réel.")}
              </p>

              {notificationsEnabled ? (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--success-soft)' }}>
                  <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                    {t('Notifications activées ✓')}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleEnableNotifications}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors"
                  style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('Activation...')}
                    </>
                  ) : (
                    <>
                      <Bell className="w-5 h-5" />
                      {t('Activer les notifications')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 2 : Notifications Push */}
        {pushSupported && (
          <div className="rounded-lg p-6 mb-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--brand-soft)' }}>
                <Bell className="w-6 h-6" style={{ color: 'var(--brand)' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                  {t('Notifications Push (Hors ligne)')}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
                  {t("Recevez des notifications même quand l'application est fermée ou que vous êtes sur un autre onglet. Idéal pour ne jamais manquer une tâche urgente.")}
                </p>

                {!notificationsEnabled ? (
                  <div className="p-3 rounded-lg" style={{ background: 'var(--warning-soft)' }}>
                    <p className="text-sm" style={{ color: 'var(--warning)' }}>
                      {t("⚠️ Activez d'abord les notifications navigateur")}
                    </p>
                  </div>
                ) : (
                  <>
                    {pushSubscribed ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--success-soft)' }}>
                          <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                            {t('Notifications Push activées ✓')}
                          </span>
                        </div>
                        <button
                          onClick={handleTogglePush}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors"
                          style={{ background: 'var(--danger)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              {t('Désactivation...')}
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5" />
                              {t('Désactiver les Push')}
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleTogglePush}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors"
                        style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('Activation...')}
                          </>
                        ) : (
                          <>
                            <Bell className="w-5 h-5" />
                            {t('Activer les notifications Push')}
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

        {/* Section 3 : Preferences Email */}
        <div className="rounded-lg p-6 mb-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--brand-soft)' }}>
              <Mail className="w-6 h-6" style={{ color: 'var(--brand)' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                {t('Notifications par email')}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
                {t('Choisissez quels emails vous souhaitez recevoir. Les emails sont envoyes en complement des notifications push.')}
              </p>

              {emailPrefs ? (
                <div className="space-y-3">
                  {[
                    { key: 'emailOnNewTask', label: t('Nouvelle tache assignee'), desc: t('Quand un document vous est soumis pour validation') },
                    { key: 'emailOnApproval', label: t('Document approuve'), desc: t('Quand votre document est approuve par tous les validateurs') },
                    { key: 'emailOnRejection', label: t('Document rejete'), desc: t('Quand votre document est rejete par un validateur') },
                    { key: 'emailOnComment', label: t('Commentaire ajoute'), desc: t('Quand un validateur ajoute un commentaire') },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{label}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{desc}</p>
                      </div>
                      <button
                        onClick={() => toggleEmailPref(key)}
                        disabled={savingPrefs}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-3"
                        style={{ background: emailPrefs[key] ? 'var(--brand)' : 'var(--fg-subtle)', border: 'none', cursor: 'pointer' }}
                      >
                        <span
                          className="inline-block h-4 w-4 transform rounded-full shadow transition-transform"
                          style={{ background: '#fff', transform: emailPrefs[key] ? 'translateX(24px)' : 'translateX(4px)' }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> {t('Chargement des preferences...')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4 : Test */}
        <div className="rounded-lg p-6 mb-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--warning-soft)' }}>
              <RefreshCw className="w-6 h-6" style={{ color: 'var(--warning)' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                {t('Tester les notifications')}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
                {t('Envoyez-vous une notification de test pour vérifier que tout fonctionne correctement.')}
              </p>
              <button
                onClick={handleTestNotification}
                disabled={!notificationsEnabled}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors"
                style={{ background: 'var(--warning)', color: '#fff', border: 'none', cursor: !notificationsEnabled ? 'not-allowed' : 'pointer', opacity: !notificationsEnabled ? 0.5 : 1 }}
              >
                <Bell className="w-5 h-5" />
                {t('Envoyer une notification test')}
              </button>
            </div>
          </div>
        </div>

        {/* Section 5 : Informations */}
        <div className="rounded-lg p-6" style={{ background: 'var(--brand-soft)' }}>
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: 'var(--brand)' }} />
            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--brand)' }}>
                {t('À propos des notifications')}
              </h4>
              <ul className="text-sm space-y-2" style={{ color: 'var(--brand)' }}>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--brand)' }}>•</span>
                  <span>{t('Vous recevrez des notifications pour toutes les nouvelles tâches qui vous sont assignées')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--brand)' }}>•</span>
                  <span>{t("Les notifications en temps réel (Socket.IO) fonctionnent quand l'application est ouverte")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--brand)' }}>•</span>
                  <span>{t("Les notifications Push vous alertent même quand l'application est fermée")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--brand)' }}>•</span>
                  <span>{t('Vous pouvez désactiver les notifications à tout moment depuis cette page')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--brand)' }}>•</span>
                  <span>{t("Un son d'alerte accompagne chaque notification")}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
