// ================================================
//  Orbita Movil - Service Worker
//  Innovación en cada órbita · Honduras
// ================================================

const CACHE_NAME = 'orbita-movil-v1';
const OFFLINE_URL = '/';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sitemap.xml',
  '/robots.txt'
];

// ── Instalación: precachear archivos clave ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ── Activación: limpiar cachés viejas ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first para assets, Network-first para API ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar peticiones al panel admin ni externas
  if (
    url.hash === '#admin' ||
    url.pathname.startsWith('/admin') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Estrategia: Network first, fallback a caché
  event.respondWith(
    fetch(request)
      .then(response => {
        // Guardar copia fresca en caché si es válida
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin red: servir desde caché
        return caches.match(request).then(cached => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

// ── Mensajes desde la app (ej: forzar actualización) ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
