// frontend/public/sw.js — GED PWA Service Worker v3
// Cache intelligent + Background Sync pour mode offline complet

// __SW_VERSION__ est remplacé au build par vite.config.js (hash unique par build).
// En dev (placeholder non remplacé), on retombe sur une valeur fixe.
const CACHE_VERSION = '__SW_VERSION__'.includes('SW_VERSION') ? 'ged-dev' : '__SW_VERSION__';
const STATIC_CACHE  = `static-${CACHE_VERSION}`;
const API_CACHE     = `api-${CACHE_VERSION}`;
const IMG_CACHE     = `img-${CACHE_VERSION}`;
const SYNC_QUEUE_KEY = 'ged-sync-queue';

// App shell — chargé au premier install, disponible instantanément offline
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
];

// Endpoints API mis en cache pour lecture offline
// (Network First : toujours essayer le réseau, fallback cache)
const CACHEABLE_API = [
  '/api/documents',
  '/api/workflows/my-tasks',
  '/api/lists/services',
  '/api/users',
  '/api/documents/categories',
  '/api/workflow-templates',
  '/api/template-permissions/my-templates',
];

// ─── INSTALL ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Install', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        // Précacher les URLs de base
        await cache.addAll(PRECACHE_URLS);
        // Précacher aussi les assets Vite référencés dans index.html
        // (noms hashés — on les discover en fetchant index.html et parsant les scripts)
        try {
          const res  = await fetch('/index.html', { cache: 'no-store' });
          const html = await res.text();
          // Trouver tous les /assets/xxx.js et /assets/xxx.css
          const assets = [...html.matchAll(/\/assets\/[^"'\s]+\.(js|css)/g)].map(m => m[0]);
          const unique  = [...new Set(assets)];
          if (unique.length) await cache.addAll(unique);
          console.log('[SW] Assets précachés:', unique.length);
        } catch (e) {
          console.warn('[SW] Précache assets échoué (mode offline?):', e.message);
        }
      })
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => ![STATIC_CACHE, API_CACHE, IMG_CACHE].includes(k))
          .map(k => {
            console.log('[SW] Suppression ancien cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer socket.io, extensions chrome, requêtes non-HTTP
  if (
    url.pathname.startsWith('/socket.io') ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'blob:' ||
    !['http:', 'https:'].includes(url.protocol)
  ) return;

  // ── POST/PUT/PATCH/DELETE : ne pas interférer (géré par la sync queue côté app) ──
  if (request.method !== 'GET') return;

  // ── API : Network First avec fallback cache ──
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = CACHEABLE_API.some(path => url.pathname.startsWith(path));
    if (isCacheable) {
      event.respondWith(networkFirstAPI(request));
    }
    // Les autres appels API (auth, upload…) ne sont pas mis en cache
    return;
  }

  // ── Assets Vite (hashed) : Cache First — ne pas bloquer sur erreur réseau ──
  if (
    url.pathname.startsWith('/assets/') ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE).catch(() => fetch(request)));
    return;
  }

  // ── Images ──
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    event.respondWith(cacheFirst(request, IMG_CACHE));
    return;
  }

  // ── Navigation SPA : Network First, fallback index.html ──
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNav(request));
    return;
  }
});

// ─── BACKGROUND SYNC ───────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'ged-sync-queue') {
    console.log('[SW] Background Sync déclenché');
    event.waitUntil(processSyncQueue());
  }
});

// ─── PUSH NOTIFICATIONS ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'GED', body: 'Vous avez une nouvelle notification' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {}

  event.waitUntil(self.registration.showNotification(data.title || 'GED', {
    body: data.body || 'Nouvelle notification',
    icon: '/icons/icon-192.png',
    badge: '/favicon.ico',
    tag: data.tag || 'default',
    data: data.data || { url: '/my-tasks' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/my-tasks';
  event.waitUntil(clients.openWindow(urlToOpen));
});

// ─── MESSAGE depuis l'app ──────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    event.ports[0]?.postMessage({ ok: true });
  }
  if (event.data?.type === 'CACHE_API_RESPONSE') {
    // L'app peut demander au SW de mettre en cache une réponse spécifique
    const { url, data } = event.data;
    caches.open(API_CACHE).then(cache => {
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(url, response);
    });
  }
});

// ─── STRATÉGIES DE CACHE ───────────────────────────────────────────────────

async function networkFirstAPI(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      // Indiquer que la réponse vient du cache offline
      const data = await cached.json();
      return new Response(
        JSON.stringify({ ...data, _fromCache: true, _cachedAt: cached.headers.get('date') }),
        { headers: { 'Content-Type': 'application/json', 'X-From-Cache': 'true' } }
      );
    }
    return new Response(
      JSON.stringify({ success: false, offline: true, data: [], message: 'Hors connexion — données non disponibles' }),
      { headers: { 'Content-Type': 'application/json' }, status: 503 }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.destination === 'image') {
      // Pixel transparent en fallback
      return new Response(
        atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
        { headers: { 'Content-Type': 'image/gif' } }
      );
    }
    throw new Error('Ressource non disponible hors connexion');
  }
}

async function networkFirstNav(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // SPA : toujours servir index.html pour que React Router prenne la main
    const cached = await caches.match('/index.html') || await caches.match('/');
    if (cached) return cached;
    return new Response(
      '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>GED — Hors connexion</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}div{text-align:center;padding:40px}h1{color:#1B3A6B;margin-bottom:8px}p{color:#64748b}</style></head><body><div><h1>📄 GED</h1><p>Vous êtes hors connexion.</p><p>Reconnectez-vous au réseau pour accéder à l\'application.</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#1B3A6B;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Réessayer</button></div></body></html>',
      { headers: { 'Content-Type': 'text/html' }, status: 503 }
    );
  }
}

// ─── TRAITEMENT DE LA SYNC QUEUE ───────────────────────────────────────────
async function processSyncQueue() {
  // Lire la queue depuis IndexedDB via un client ouvert
  const allClients = await self.clients.matchAll();
  if (allClients.length === 0) return;

  // Notifier l'app de traiter sa propre queue
  allClients.forEach(client => {
    client.postMessage({ type: 'PROCESS_SYNC_QUEUE' });
  });
}
