const CACHE = 'osakatrip-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './app-icon-192.png',
  './app-icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache GAS (需要即時) or Google Maps / external services
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com') ||
      url.hostname.includes('maps.app.goo.gl') ||
      url.hostname.includes('google.com/maps')) {
    return; // let browser handle normally
  }
  // Cache-first for photos / fonts / icons
  if (url.pathname.match(/\.(jpg|jpeg|png|webp|ico|woff2?)$/i) ||
      url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached))
    );
    return;
  }
  // Network-first for HTML / CSS / JS (拿最新版，離線才用快取)
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && (e.request.method === 'GET')) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
