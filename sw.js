// 네트워크 우선, 실패 시 캐시 (오프라인 플레이 지원)
const CACHE = 'cosmo-arcade-v5';
const FILES = ['./', 'index.html', 'privacy.html', 'config.js', 'ads.js', 'icon.svg', 'manifest.webmanifest',
  'shared/kit.js', 'shared/kit.css', 'shared/share.js', 'shared/age-gate.js',
  'orbit/index.html', 'orbit/style.css', 'orbit/game.js',
  'blocks/index.html', 'blocks/game.js', 'merge/index.html', 'merge/game.js', 'sort/index.html', 'sort/game.js', 'rush/index.html', 'rush/game.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('cosmo-arcade-') && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const network = fetch(e.request);
  e.waitUntil(network.then((r) => {
    if (!r.ok) return;
    const copy = r.clone();
    return caches.open(CACHE).then((c) => c.put(e.request, copy));
  }).catch(() => {}));
  e.respondWith(network.catch(() => caches.match(e.request, { ignoreSearch: true })));
});
