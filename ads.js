// 광고 어댑터: Ads.rewarded(name) -> Promise<boolean>, Ads.interstitial(name) -> Promise<void>
(() => {
  'use strict';
  const cfg = (window.GAME_CONFIG && window.GAME_CONFIG.ads) || { provider: 'mock' };
  const hooks = { onStart() {}, onEnd() {} };
  let scriptState = 'idle'; // idle | loading | ready | failed

  function loadAdsense() {
    if (scriptState !== 'idle') return;
    scriptState = 'loading';
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    s.setAttribute('data-ad-client', cfg.adsenseClient);
    s.setAttribute('data-ad-frequency-hint', '30s');
    if (cfg.testMode) s.setAttribute('data-adbreak-test', 'on');
    s.crossOrigin = 'anonymous';
    s.onload = () => { scriptState = 'ready'; };
    s.onerror = () => { scriptState = 'failed'; };
    document.head.appendChild(s);
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({ preloadAdBreaks: 'on', sound: 'on' });
  }

  function mockAd(label, seconds) {
    return new Promise((resolve) => {
      const el = document.getElementById('adMock');
      const txt = document.getElementById('adMockText');
      const cnt = document.getElementById('adMockCount');
      txt.textContent = label;
      let left = seconds;
      cnt.textContent = left;
      el.hidden = false;
      const iv = setInterval(() => {
        left -= 1;
        cnt.textContent = Math.max(left, 0);
        if (left <= 0) { clearInterval(iv); el.hidden = true; resolve(true); }
      }, 1000);
    });
  }

  function adsenseBreak(opts, wantReward) {
    return new Promise((resolve) => {
      if (scriptState !== 'ready') return resolve(false);
      let viewed = false, done = false;
      const finish = () => { if (!done) { done = true; resolve(wantReward ? viewed : true); } };
      const o = Object.assign({
        beforeAd: () => hooks.onStart(),
        afterAd: () => hooks.onEnd(),
        adBreakDone: finish
      }, opts);
      if (wantReward) {
        o.beforeReward = (showAdFn) => showAdFn();
        o.adDismissed = () => {};
        o.adViewed = () => { viewed = true; };
      }
      try { window.adsbygoogle.push(o); } catch (e) { finish(); }
      setTimeout(finish, 90000); // 안전장치
    });
  }

  window.Ads = {
    hooks,
    init() { if (cfg.provider === 'adsense') loadAdsense(); },
    async rewarded(name) {
      if (cfg.provider === 'none') return true;
      if (cfg.provider === 'adsense') return adsenseBreak({ type: 'reward', name }, true);
      hooks.onStart();
      const ok = await mockAd(window.T ? window.T('adph') : 'AD', 3);
      hooks.onEnd();
      return ok;
    },
    async interstitial(name) {
      if (cfg.provider === 'none') return;
      if (cfg.provider === 'adsense') { await adsenseBreak({ type: 'next', name }, false); return; }
      hooks.onStart();
      await mockAd(window.T ? window.T('adph') : 'AD', 2);
      hooks.onEnd();
    }
  };
})();
