const CACHE = 'kalaha-v1';
const PRECACHE = ['/', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigation and API; cache-first for static assets
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip WebSocket and non-GET requests
  if (request.method !== 'GET' || request.url.includes('/ws')) return;

  // Static assets (JS/CSS/images): cache-first
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => cached ?? fetchAndCache(request))
    );
    return;
  }

  // Navigation: network-first, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => { cacheIfOk(request, response.clone()); return response; })
      .catch(() => caches.match(request))
  );
});

function fetchAndCache(request) {
  return fetch(request).then(response => {
    cacheIfOk(request, response.clone());
    return response;
  });
}

function cacheIfOk(request, response) {
  if (response && response.status === 200) {
    caches.open(CACHE).then(c => c.put(request, response));
  }
}
