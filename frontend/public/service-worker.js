const CACHE_NAME = 'resto-os-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico'
];

// Install event: Pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first for API, Cache-first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: Network first
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets and pages: Cache first, fall back to network, then cache the result
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) return response;

        return fetch(request).then(networkResponse => {
          // Don't cache if not a valid response or if it's a POST request
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' || request.method !== 'GET') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        });
      })
  );
});
