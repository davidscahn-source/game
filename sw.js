// 네트워크 우선, 실패 시 캐시 (오프라인 플레이 지원)
const CACHE = 'cosmo-arcade-v1';
const FILES = ['./', 'index.html', 'privacy.html', 'config.js', 'ads.js', 'icon.svg', 'manifest.webmanifest',
  'shared/kit.js', 'shared/kit.css',
  'orbit/index.html', 'orbit/style.css', 'orbit/game.js',
  'blocks/index.html', 'blocks/game.js', 'merge/index.html', 'merge/game.js', 'sort/index.html', 'sort/game.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
