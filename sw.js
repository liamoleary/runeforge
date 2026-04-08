// RuneForge Service Worker - network first, always fresh content
const CACHE_NAME = 'runeforge-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
      const url = new URL(event.request.url);

                        // Never cache or intercept API calls - let them pass through directly
                        if (url.pathname.startsWith('/api/')) {
                                return;
                        }

                        event.respondWith(
                                fetch(event.request)
                                  .then((response) => {
                                              if (response.ok && event.request.method === 'GET') {
                                                            const clone = response.clone();
                                                            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                                              }
                                              return response;
                                  })
                                  .catch(() => caches.match(event.request))
                              );
});
