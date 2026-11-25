// 웹에서는 현재 배포 주소, 앱에서는 공개 웹 주소를 공유한다.
window.CosmoShare = (() => {
  'use strict';
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());

  function gameUrl(game, params = {}) {
    const base = native
      ? window.GAME_CONFIG.publicGameUrl
      : new URL('../', location.href).href;
    const url = new URL(game + '/index.html', base.endsWith('/') ? base : base + '/');
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.href;
  }

  async function send({ title, text, url }) {
    try {
      if (native) {
        await cap.nativePromise('Share', 'share', { title, text, url, dialogTitle: title });
        return 'shared';
      }
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return 'shared';
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text + ' ' + url);
        return 'copied';
      }
    } catch (e) {
      if (e && (e.name === 'AbortError' || /cancel/i.test(e.message || ''))) return 'cancelled';
    }
    return 'failed';
  }
  return { gameUrl, send };
})();
