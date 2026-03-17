// frontend/src/utils/pushNotificationHelper.js

/**
 * Vérifie si les Push Notifications sont supportées
 */
export const isPushSupported = () => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Convertit une clé VAPID base64 en Uint8Array
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Enregistre le Service Worker
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker non supporté');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('✅ Service Worker enregistré:', registration.scope);

    // Attendre qu'il soit actif
    if (registration.installing) {
      await new Promise((resolve) => {
        registration.installing.addEventListener('statechange', (e) => {
          if (e.target.state === 'activated') {
            resolve();
          }
        });
      });
    }

    return registration;
  } catch (error) {
    console.error('❌ Erreur enregistrement Service Worker:', error);
    throw error;
  }
};

/**
 * Vérifie si déjà souscrit aux Push
 */
export const checkPushSubscription = async () => {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('❌ Erreur vérification souscription:', error);
    return false;
  }
};

/**
 * Souscrit aux Push Notifications
 */
export const subscribeToPush = async () => {
  if (!isPushSupported()) {
    throw new Error('Push notifications non supportées');
  }

  try {
    // S'assurer que le Service Worker est enregistré
    const registration = await navigator.serviceWorker.ready;

    // Vérifier si déjà souscrit
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('✅ Déjà souscrit aux push notifications');
      return subscription;
    }

    // Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission de notification refusée');
    }

    // Récupérer la clé VAPID publique depuis le backend
    const response = await fetch('/api/notifications/vapid-public-key');
    
    if (!response.ok) {
      throw new Error('Clés VAPID non configurées sur le serveur');
    }

    const { publicKey } = await response.json();

    // Souscrire avec la clé VAPID
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    console.log('✅ Souscription push créée:', subscription.endpoint);

    // Envoyer la souscription au backend
    const token = localStorage.getItem('token');
    const saveResponse = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
    });

    if (!saveResponse.ok) {
      throw new Error('Échec sauvegarde souscription sur le serveur');
    }

    console.log('✅ Souscription sauvegardée sur le serveur');
    return subscription;

  } catch (error) {
    console.error('❌ Erreur souscription push:', error);
    throw error;
  }
};

/**
 * Se désinscrire des Push Notifications
 */
export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) {
    throw new Error('Push notifications non supportées');
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('ℹ️ Aucune souscription active');
      return;
    }

    // Supprimer du serveur d'abord
    const token = localStorage.getItem('token');
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    // Puis du navigateur
    await subscription.unsubscribe();
    console.log('✅ Désinscription réussie');

  } catch (error) {
    console.error('❌ Erreur désinscription:', error);
    throw error;
  }
};

/**
 * Envoie une notification de test
 */
export const sendTestNotification = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Échec envoi notification test');
    }

    console.log('✅ Notification test envoyée');
  } catch (error) {
    console.error('❌ Erreur envoi test:', error);
    throw error;
  }
};