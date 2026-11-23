const CACHE_PREFIX = 'fitrota-shell-';
const CACHE = CACHE_PREFIX + 'v13';
const SHELL = ['/index.html', '/styles.css', '/app.js', '/calorie.js', '/body-goals.js', '/food.js', '/recipes.js', '/menus.js', '/workouts.js', '/focused-workouts.js', '/exercise-videos.js', '/workout-session.js', '/workout-sound.js', '/manifest.webmanifest',
  '/images/dashboard-cover.webp', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL.map((url) => new Request(url, {cache:'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const {request} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const key = request.mode === 'navigate' && url.pathname === '/' ? '/index.html' : url.pathname;
  if (!SHELL.includes(key)) return;

  // HTML ve uygulama dosyalarını aynı önbellek sürümünden sun.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(key) || fetch(request);
  })());
});
