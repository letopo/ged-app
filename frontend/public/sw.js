// frontend/public/sw.js - Service Worker SIMPLIFIÉ pour debug

console.log('🔧 Service Worker chargé');

// Installation
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installé');
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activé');
  event.waitUntil(self.clients.claim());
});

// Réception des notifications push
self.addEventListener('push', (event) => {
  console.log('🔔 Push reçu:', event);

  let data = { title: 'Notification', body: 'Vous avez une nouvelle notification' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Erreur parsing push:', e);
  }

  const title = data.title || 'Nouvelle notification';
  const options = {
    body: data.body || 'Vous avez une nouvelle notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'default',
    data: data.data || { url: '/mes-taches' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification cliquée');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/mes-taches';
  
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});

console.log('✅ Service Worker prêt');