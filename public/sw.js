const CACHE_VERSION = 2;
const CURRENT_CACHES = {
  offline: `offline-v${CACHE_VERSION}`
};
const OFFLINE_URLS = [
  '/index.html',
  '/client.js',
  // Include other assets here, e.g., CSS, images
  'https://use.fontawesome.com/releases/v5.15.4/js/all.js',
  'https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.3/css/bulma.min.css',
  'images/icon-192.png',
  'images/icon-512.png'
  // Add URLs for other images and icons as needed
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CURRENT_CACHES.offline).then(cache => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // IMPORTANT: Clone the response. A response is a stream
          // and because we want the browser to consume the response
          // as well as the cache consuming the response, we need
          // to clone it so we have two streams.
          var responseToCache = response.clone();

          caches.open(CURRENT_CACHES.offline)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  // Clear old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('offline-') &&
                 cacheName !== CURRENT_CACHES.offline;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
