importScripts('/pwa-release.js');
const {id,assets} = self.FITROTA_RELEASE;
const CACHE_PREFIX = 'fitrota-shell-';
const CACHE = CACHE_PREFIX + id;

function releaseRequest(url) {
  return new Request(new URL(url,self.location.origin),{cache:'reload',integrity:assets[url]});
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const previous = await caches.keys();
    const cache = await caches.open(CACHE);
    try {
      await cache.addAll(Object.keys(assets).map(releaseRequest));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
    // Older FitRota pages cannot request activation. Let the new cache
    // take over once without reloading those pages or interrupting forms.
    if (self.registration.active &&
        previous.some(name => /^fitrota-shell-v\d+$/.test(name)) &&
        !previous.some(name => /^fitrota-shell-[a-f0-9]{24}$/.test(name))) {
      await self.skipWaiting();
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'FITROTA_ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
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
  if (!Object.hasOwn(assets,key)) return;

  // HTML ve uygulama dosyalarını aynı önbellek sürümünden sun.
  event.respondWith((async () => {
    return await caches.match(key,{cacheName:CACHE}) || fetch(releaseRequest(key));
  })());
});
