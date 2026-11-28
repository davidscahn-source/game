const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('ads.js', 'utf8');
const allowed = { status: 'OBTAINED', isConsentFormAvailable: false, canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' };

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

function createNativeAds({ ageGroup = 'adult', ageCheck, consent = () => Promise.resolve(allowed), consentForm = () => Promise.resolve(allowed), initialize = () => Promise.resolve(), prepare = () => Promise.resolve(), show = () => Promise.resolve(), privacy = () => Promise.resolve(), admob = {}, stored = {} } = {}) {
  const listeners = new Map();
  const calls = [];
  const cap = {
    isNativePlatform: () => true,
    nativePromise(_plugin, method, options) {
      calls.push(method);
      if (method === 'requestConsentInfo') return consent(options);
      if (method === 'showConsentForm') return consentForm();
      if (method === 'showPrivacyOptionsForm') return privacy();
      if (method === 'initialize') return initialize(options);
      if (method === 'prepareRewardVideoAd' || method === 'prepareInterstitial') return prepare(method, options);
      if (method === 'showRewardVideoAd' || method === 'showInterstitial') return show(method);
      return Promise.resolve();
    },
    addListener(_plugin, event, callback) { listeners.set(event, callback); }
  };
  const ageGate = { group: ageGroup, ensure: () => ageCheck ? ageCheck() : Promise.resolve(ageGate.group) };
  const window = { Capacitor: cap, AgeGate: ageGate, GAME_CONFIG: { ads: { admob: { rewardedId: 'reward', interstitialId: 'interstitial', testMode: true, ...admob } } } };
  const localStorage = { getItem: (key) => (key in stored ? stored[key] : null), setItem: (key, value) => { stored[key] = String(value); } };
  vm.runInNewContext(source, { window, localStorage, Promise, Date, setTimeout, clearTimeout });
  return { ads: window.Ads, calls, stored, emit: (event) => listeners.get(event)?.() };
}

test('a rewarded ad works only when the SDK receives age-protected settings', async () => {
  const { ads, calls, emit } = createNativeAds({
    consent: (options) => Promise.resolve(options.tagForUnderAgeOfConsent === false ? allowed : { canRequestAds: false }),
    initialize: (options) => options.tagForUnderAgeOfConsent && options.maxAdContentRating === 'General'
      ? Promise.resolve()
      : Promise.reject(new Error('Ad request is not age protected'))
  });
  const reward = ads.rewarded('continue');
  await waitUntil(() => calls.includes('showRewardVideoAd'));
  emit('onRewardedVideoAdReward');
  emit('onRewardedVideoAdDismissed');
  assert.equal(await reward, true);
});

test('a minor cannot receive a rewarded ad, while an adult can', async () => {
  const minor = createNativeAds({ ageGroup: 'minor' });
  assert.equal(minor.ads.canShowAds, false);
  assert.equal(await minor.ads.rewarded('continue'), false);

  const adult = createNativeAds();
  assert.equal(adult.ads.canShowAds, true);
  const reward = adult.ads.rewarded('continue');
  await waitUntil(() => adult.calls.includes('showRewardVideoAd'));
  adult.emit('onRewardedVideoAdReward');
  adult.emit('onRewardedVideoAdDismissed');
  assert.equal(await reward, true);
  assert.equal(minor.calls.length, 0);
});

test('an ad waits for age verification and remains unavailable when the user is a minor', async () => {
  const age = deferred();
  const { ads, calls } = createNativeAds({ ageGroup: null, ageCheck: () => age.promise });
  const reward = ads.rewarded('continue');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 0);
  age.resolve('minor');
  assert.equal(await reward, false);
});

async function waitUntil(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail('Expected ad flow did not occur');
}

test('a reward requested during consent waits, then resumes the game after the ad is earned and closed', async () => {
  const consent = deferred();
  const { ads, calls, emit } = createNativeAds({ consent: () => consent.promise });
  const game = [];
  ads.hooks.onStart = () => game.push('paused');
  ads.hooks.onEnd = () => game.push('resumed');
  ads.init();
  let outcome = 'pending';
  const reward = ads.rewarded('continue').then((value) => { outcome = value; return value; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(outcome, 'pending');
  assert.equal(calls.includes('showRewardVideoAd'), false);
  consent.resolve(allowed);
  await waitUntil(() => calls.includes('showRewardVideoAd'));
  emit('onRewardedVideoAdReward');
  emit('onRewardedVideoAdDismissed');
  assert.equal(await reward, true);
  assert.deepEqual(game, ['paused', 'resumed']);
});

test('unavailable consent leaves the game playable without requesting an ad', async () => {
  const denied = { status: 'REQUIRED', isConsentFormAvailable: false, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' };
  const { ads, calls } = createNativeAds({ consent: () => Promise.resolve(denied) });
  const game = [];
  ads.hooks.onStart = () => game.push('paused');
  assert.equal(await ads.rewarded('continue'), false);
  assert.equal(ads.privacyOptionsRequired, true);
  assert.equal(calls.includes('showRewardVideoAd'), false);
  assert.deepEqual(game, []);
});

test('a required consent form must finish before a rewarded ad can start', async () => {
  const form = deferred();
  const info = { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' };
  const { ads, calls, emit } = createNativeAds({ consent: () => Promise.resolve(info), consentForm: () => form.promise });
  const reward = ads.rewarded('continue');
  await waitUntil(() => calls.includes('showConsentForm'));
  assert.equal(calls.includes('showRewardVideoAd'), false);
  form.resolve(allowed);
  await waitUntil(() => calls.includes('showRewardVideoAd'));
  emit('onRewardedVideoAdReward');
  emit('onRewardedVideoAdDismissed');
  assert.equal(await reward, true);
});

test('closing an ad before earning the reward resumes the game without granting it', async () => {
  const { ads, calls, emit } = createNativeAds();
  const game = [];
  ads.hooks.onStart = () => game.push('paused');
  ads.hooks.onEnd = () => game.push('resumed');
  const reward = ads.rewarded('continue');
  await waitUntil(() => calls.includes('showRewardVideoAd'));
  emit('onRewardedVideoAdDismissed');
  assert.equal(await reward, false);
  assert.deepEqual(game, ['paused', 'resumed']);
});

test('withdrawing consent through privacy options prevents later ad display', async () => {
  let canRequestAds = true;
  const consent = (options) => options.tagForUnderAgeOfConsent === false
    ? Promise.resolve({ status: 'OBTAINED', isConsentFormAvailable: false, canRequestAds, privacyOptionsRequirementStatus: 'REQUIRED' })
    : Promise.reject(new Error('Consent check is not age protected'));
  const { ads, calls } = createNativeAds({ consent, privacy: () => { canRequestAds = false; return Promise.resolve(); } });
  ads.init();
  await waitUntil(() => ads.privacyOptionsRequired);
  assert.equal(await ads.showPrivacyOptions(), true);
  assert.equal(await ads.rewarded('continue'), false);
  assert.equal(calls.includes('showRewardVideoAd'), false);
});

test('a failed ad load returns without pausing the game', async () => {
  const { ads } = createNativeAds({ prepare: () => Promise.reject(new Error('offline')) });
  const game = [];
  ads.hooks.onStart = () => game.push('paused');
  assert.equal(await ads.rewarded('continue'), false);
  assert.deepEqual(game, []);
});

const noForms = () => Promise.reject(new Error("Publisher misconfiguration: Failed to read publisher's account configuration; no form(s) configured for the input app ID."));
const offline = () => Promise.reject(new Error('Network error'));

async function earnReward(native) {
  const reward = native.ads.rewarded('continue');
  await waitUntil(() => native.calls.includes('showRewardVideoAd'));
  native.emit('onRewardedVideoAdReward');
  native.emit('onRewardedVideoAdDismissed');
  return reward;
}

test('a missing privacy message blocks ads in the default global configuration', async () => {
  const { ads, calls } = createNativeAds({ consent: noForms });
  assert.equal(await ads.rewarded('continue'), false);
  assert.equal(calls.includes('prepareRewardVideoAd'), false);
});

test('the legacy missing-message fallback is available only when explicitly enabled', async () => {
  assert.equal(await earnReward(createNativeAds({ consent: noForms, admob: { allowConsentFallback: true, allowAdsWithoutConsentMessage: true } })), true);
});

test('a missing privacy message blocks ads when the owner opts out of that fallback', async () => {
  const { ads, calls } = createNativeAds({ consent: noForms, admob: { allowConsentFallback: true, allowAdsWithoutConsentMessage: false } });
  assert.equal(await ads.rewarded('continue'), false);
  assert.equal(calls.includes('prepareRewardVideoAd'), false);
});

test('a failed consent check on first launch requests no ads', async () => {
  const { ads, calls } = createNativeAds({ consent: offline });
  assert.equal(await ads.rewarded('continue'), false);
  assert.equal(calls.includes('prepareRewardVideoAd'), false);
});

test('a failed consent check ignores even a previous approval by default', async () => {
  const { ads, calls } = createNativeAds({ consent: offline, stored: { 'cosmo.consent': '1' } });
  assert.equal(await ads.rewarded('continue'), false);
  assert.equal(calls.includes('prepareRewardVideoAd'), false);
});

test('the legacy fallback can reuse the last confirmed answer when explicitly enabled', async () => {
  const stored = {};
  assert.equal(await earnReward(createNativeAds({ stored, admob: { allowConsentFallback: true } })), true);
  assert.equal(stored['cosmo.consent'], '1');
  assert.equal(await earnReward(createNativeAds({ consent: offline, stored, admob: { allowConsentFallback: true } })), true);
  const refused = { 'cosmo.consent': '0' };
  assert.equal(await createNativeAds({ consent: offline, stored: refused, admob: { allowConsentFallback: true } }).ads.rewarded('continue'), false);
});

test('the hub confirms consent without preloading ads it never shows', async () => {
  const { ads, calls } = createNativeAds();
  ads.init({ preload: false });
  await waitUntil(() => calls.includes('initialize'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.some((c) => c.startsWith('prepare')), false);
});
