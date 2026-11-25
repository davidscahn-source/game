// 광고 어댑터: Ads.rewarded(name) -> Promise<boolean>, Ads.interstitial(name) -> Promise<void>
(() => {
  'use strict';
  const cfg = (window.GAME_CONFIG && window.GAME_CONFIG.ads) || { provider: 'mock' };
  const hooks = { onStart() {}, onEnd() {}, onPrivacyOptionsChanged() {} };
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
    showPrivacyOptionsForm: () => call('showPrivacyOptionsForm'),
    prepareRewardVideoAd: (o) => call('prepareRewardVideoAd', o),
    showRewardVideoAd: () => call('showRewardVideoAd'),
    prepareInterstitial: (o) => call('prepareInterstitial', o),
    showInterstitial: () => call('showInterstitial'),
    addListener: (ev, cb) => cap.addListener('AdMob', ev, cb)
  };
  const am = cfg.admob || {};
  const ready = { reward: false, inter: false };
  const loading = { reward: null, inter: null };
  let waiter = null, busy = false, initPromise = null;
  let sdkInitialized = false, listenersReady = false, canRequestAds = false;
  let privacyOptionsRequired = false, consentGeneration = 0;

  // 네트워크나 SDK가 응답하지 않아도 게임에 영구적으로 갇히지 않는다.
  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Ad request timed out')), ms);
      Promise.resolve(promise).then(
        (value) => { clearTimeout(timer); resolve(value); },
        (error) => { clearTimeout(timer); reject(error); }
      );
    });
  }

  function setConsent(info) {
    canRequestAds = !!(info && info.canRequestAds);
    privacyOptionsRequired = !!(info && info.privacyOptionsRequirementStatus === 'REQUIRED');
    hooks.onPrivacyOptionsChanged(privacyOptionsRequired);
  }

  function admobLoad(kind) {
    if (!AdMob || !canRequestAds || !sdkInitialized) return Promise.resolve(false);
    if (ready[kind]) return Promise.resolve(true);
    if (loading[kind]) return loading[kind];
    const generation = consentGeneration;
    loading[kind] = (async () => {
      try {
        const request = kind === 'reward'
          ? AdMob.prepareRewardVideoAd({ adId: am.rewardedId, isTesting: !!am.testMode })
          : AdMob.prepareInterstitial({ adId: am.interstitialId, isTesting: !!am.testMode });
        await withTimeout(request, 15000);
        ready[kind] = canRequestAds && generation === consentGeneration;
      } catch (e) { ready[kind] = false; }
      return ready[kind];
    })().finally(() => { loading[kind] = null; });
    return loading[kind];
  }

  function registerListeners() {
    if (listenersReady) return;
    const finish = (kind, ok) => {
      if (waiter && waiter.kind === kind) waiter.finish(ok);
      admobLoad(kind);
    };
    AdMob.addListener('onRewardedVideoAdReward', () => { if (waiter && waiter.kind === 'reward') waiter.rewarded = true; });
    AdMob.addListener('onRewardedVideoAdDismissed', () => finish('reward', !!(waiter && waiter.kind === 'reward' && waiter.rewarded)));
    AdMob.addListener('onRewardedVideoAdFailedToShow', () => finish('reward', false));
    AdMob.addListener('interstitialAdDismissed', () => finish('inter', true));
    AdMob.addListener('interstitialAdFailedToShow', () => finish('inter', false));
    listenersReady = true;
  }

  async function admobInit() {
    if (!AdMob) return false;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        // 동의 확인 전에는 SDK 초기화나 광고 요청을 하지 않는다.
        let info = await withTimeout(AdMob.requestConsentInfo(), 15000);
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await AdMob.showConsentForm();
        setConsent(info);
        if (!canRequestAds) return false;
        if (!sdkInitialized) {
          await withTimeout(AdMob.initialize({ initializeForTesting: !!am.testMode }), 15000);
          sdkInitialized = true;
        }
        registerListeners();
        admobLoad('reward');
        admobLoad('inter');
        return true;
      } catch (e) { setConsent(null); return false; }
    })();
    const ok = await initPromise;
    if (!ok) initPromise = null; // 다음 광고 요청에서 다시 시도할 수 있다.
    return ok;
  }

  async function admobShow(kind) {
    if (!AdMob || busy) return false;
    busy = true;
    try {
      if (!(await admobInit()) || !canRequestAds || !(await admobLoad(kind))) return false;
      ready[kind] = false;
      return await new Promise((resolve) => {
        let finished = false;
        const finish = (ok) => {
          if (finished) return;
          finished = true; clearTimeout(timer); waiter = null; hooks.onEnd(); resolve(ok);
        };
        const timer = setTimeout(() => finish(false), 180000);
        waiter = { kind, rewarded: false, finish };
        hooks.onStart();
        try {
          const request = kind === 'reward' ? AdMob.showRewardVideoAd() : AdMob.showInterstitial();
          Promise.resolve(request).catch(() => finish(false));
        } catch (e) { finish(false); }
      });
    } finally { busy = false; }
  }

  async function showPrivacyOptions() {
    if (!AdMob || busy) return false;
    await admobInit();
    if (!privacyOptionsRequired) return false;
    busy = true;
    try {
      await AdMob.showPrivacyOptionsForm();
      consentGeneration += 1; ready.reward = false; ready.inter = false;
      const info = await withTimeout(AdMob.requestConsentInfo(), 15000);
      setConsent(info);
      initPromise = null;
      return true;
    } catch (e) {
      consentGeneration += 1; ready.reward = false; ready.inter = false;
      setConsent(null); initPromise = null;
      return false;
    } finally { busy = false; }
  }

  window.Ads = {
    isNative,
    hooks,
    get privacyOptionsRequired() { return privacyOptionsRequired; },
    showPrivacyOptions,
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
