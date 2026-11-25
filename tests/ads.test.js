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

function createNativeAds({ consent = () => Promise.resolve(allowed), consentForm = () => Promise.resolve(allowed), prepare = () => Promise.resolve(), show = () => Promise.resolve(), privacy = () => Promise.resolve() } = {}) {
  const listeners = new Map();
  const calls = [];
  const cap = {
    isNativePlatform: () => true,
    nativePromise(_plugin, method, options) {
      calls.push(method);
      if (method === 'requestConsentInfo') return consent();
      if (method === 'showConsentForm') return consentForm();
      if (method === 'showPrivacyOptionsForm') return privacy();
      if (method === 'prepareRewardVideoAd' || method === 'prepareInterstitial') return prepare(method, options);
      if (method === 'showRewardVideoAd' || method === 'showInterstitial') return show(method);
      return Promise.resolve();
    },
    addListener(_plugin, event, callback) { listeners.set(event, callback); }
  };
  const window = { Capacitor: cap, GAME_CONFIG: { ads: { admob: { rewardedId: 'reward', interstitialId: 'interstitial', testMode: true } } } };
  vm.runInNewContext(source, { window, Promise, Date, setTimeout, clearTimeout });
  return { ads: window.Ads, calls, emit: (event) => listeners.get(event)?.() };
}

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
  const consent = () => Promise.resolve({ status: 'OBTAINED', isConsentFormAvailable: false, canRequestAds, privacyOptionsRequirementStatus: 'REQUIRED' });
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
