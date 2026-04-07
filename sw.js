// RuneForge Service Worker - lightweight, always fetches fresh content
const CACHE_NAME = 'runeforge-v1';

// Install - just activate immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate - claim all clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Fetch - network first, fall back to cache for offline support
self.addEventListener('fetch', (event) => {
    event.respondWith(
          fetch(event.request)
            .then((response) => {
                      // Clone and cache successful responses for offline fallback
                          if (response.ok && event.request.method === 'GET') {
                                      const clone = response.clone();
                                      caches.open(CACHE_NAME).then((cache) => {
                                                    cache.put(event.request, clone);
                                      });
                          }
                      return response;
            })
            .catch(() => {
                      // Offline - try cache
                           return caches.match(event.request);
            })
        );
});
