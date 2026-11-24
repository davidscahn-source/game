// 광고 어댑터: Ads.rewarded(name) -> Promise<boolean>, Ads.interstitial(name) -> Promise<void>
(() => {
  'use strict';
  const cfg = (window.GAME_CONFIG && window.GAME_CONFIG.ads) || { provider: 'mock' };
  const hooks = { onStart() {}, onEnd() {} };
  let scriptState = 'idle'; // idle | loading | ready | failed
  let lastAdAt = 0;

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

  // ── AdMob (안드로이드 앱) ──
  const cap = window.Capacitor;
  const isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  // 번들러 없이 네이티브 브리지를 직접 호출하는 얇은 래퍼 (@capacitor-community/admob 플러그인)
  const call = (method, opts) => cap.nativePromise('AdMob', method, opts || {});
  const AdMob = !isNative ? null : {
    initialize: (o) => call('initialize', o),
    requestConsentInfo: (o) => call('requestConsentInfo', o),
    showConsentForm: () => call('showConsentForm'),
    prepareRewardVideoAd: (o) => call('prepareRewardVideoAd', o),
    showRewardVideoAd: () => call('showRewardVideoAd'),
    prepareInterstitial: (o) => call('prepareInterstitial', o),
    showInterstitial: () => call('showInterstitial'),
    addListener: (ev, cb) => cap.addListener('AdMob', ev, cb)
  };
  const am = cfg.admob || {};
  const ready = { reward: false, inter: false };
  let waiter = null; // 현재 표시 중인 광고의 결과 콜백

  function admobLoad(kind) {
    if (!AdMob) return Promise.resolve(false);
    const call = kind === 'reward'
      ? AdMob.prepareRewardVideoAd({ adId: am.rewardedId, isTesting: !!am.testMode })
      : AdMob.prepareInterstitial({ adId: am.interstitialId, isTesting: !!am.testMode });
    return call.then(() => { ready[kind] = true; return true; }, () => { ready[kind] = false; return false; });
  }

  async function admobInit() {
    try {
      await AdMob.initialize({ initializeForTesting: !!am.testMode });
      // 유럽 등 동의가 필요한 지역에서는 구글 동의 창을 띄운다
      try {
        const info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
      } catch (e) {}
      const end = (ok) => { hooks.onEnd(); const w = waiter; waiter = null; if (w) w(ok); };
      let rewarded = false;
      AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
      AdMob.addListener('onRewardedVideoAdDismissed', () => { const r = rewarded; rewarded = false; end(r); admobLoad('reward'); });
      AdMob.addListener('onRewardedVideoAdFailedToShow', () => { rewarded = false; end(false); admobLoad('reward'); });
      AdMob.addListener('interstitialAdDismissed', () => { end(true); admobLoad('inter'); });
      AdMob.addListener('interstitialAdFailedToShow', () => { end(false); admobLoad('inter'); });
      admobLoad('reward');
      admobLoad('inter');
    } catch (e) {}
  }

  async function admobShow(kind) {
    if (!AdMob) return false;
    if (!ready[kind] && !(await admobLoad(kind))) return false;
    ready[kind] = false;
    return new Promise((resolve) => {
      waiter = resolve;
      hooks.onStart();
      const call = kind === 'reward' ? AdMob.showRewardVideoAd() : AdMob.showInterstitial();
      Promise.resolve(call).catch(() => { if (waiter === resolve) { waiter = null; hooks.onEnd(); resolve(false); } });
    });
  }

  window.Ads = {
    isNative,
    hooks,
    init() {
      if (isNative) admobInit();
      else if (cfg.provider === 'adsense') loadAdsense();
    },
    async rewarded(name) {
      lastAdAt = Date.now();
      if (isNative) return admobShow('reward');
      if (cfg.provider === 'none') return true;
      if (cfg.provider === 'adsense') return adsenseBreak({ type: 'reward', name }, true);
      hooks.onStart();
      const ok = await mockAd(window.T ? window.T('adph') : 'AD', 3);
      hooks.onEnd();
      return ok;
    },
    async interstitial(name) {
      // 이탈 방지 규칙: 처음 몇 번은 건너뛰고, 직전 광고와 최소 간격을 둔다
      let seen = 0;
      try { seen = parseInt(localStorage.getItem('cosmo.adOpps'), 10) || 0; localStorage.setItem('cosmo.adOpps', seen + 1); } catch (e) {}
      if (seen < (cfg.interstitialGrace == null ? 2 : cfg.interstitialGrace)) return;
      if (Date.now() - lastAdAt < (cfg.interstitialMinSeconds == null ? 45 : cfg.interstitialMinSeconds) * 1000) return;
      lastAdAt = Date.now();
      if (isNative) { await admobShow('inter'); return; }
      if (cfg.provider === 'none') return;
      if (cfg.provider === 'adsense') { await adsenseBreak({ type: 'next', name }, false); return; }
      hooks.onStart();
      await mockAd(window.T ? window.T('adph') : 'AD', 2);
      hooks.onEnd();
    }
  };
})();
