// frontend/sw.js
const CACHE_NAME = 'finbuddy-cache-v1';
const urlsToCache = [
  '/',
  '/parser',
  '/chat',
  '/dashboard',
  '/assets/css/styles.css',
  '/assets/js/utils.js',
  '/assets/js/dashboard.js',
  '/assets/js/chat.js',
  '/assets/js/auth.js',
  '/assets/js/index.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
