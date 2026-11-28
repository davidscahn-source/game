const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const ageSource = fs.readFileSync('shared/age-gate.js', 'utf8');
const adsSource = fs.readFileSync('ads.js', 'utf8');
const now = new Date(2026, 10, 28, 12).getTime();

function app({ saved, lang = 'en-US' } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><main>Game</main></body></html>', {
    url: 'https://localhost/', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const { window } = dom;
  const RealDate = window.Date;
  window.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  Object.defineProperty(window.navigator, 'language', { value: lang });
  const calls = [];
  window.Capacitor = {
    isNativePlatform: () => true,
    nativePromise(_plugin, method) { calls.push(method); return Promise.reject(new Error('Unexpected SDK call')); },
    addListener() {}
  };
  window.GAME_CONFIG = { ads: { admob: {} } };
  if (saved) window.localStorage.setItem('cosmo.ageGroup.v1', JSON.stringify(saved));
  window.eval(ageSource);
  return { window, calls };
}

function submit(window, year, month, day) {
  const document = window.document;
  document.querySelector('#cosmo-age-year').value = year;
  document.querySelector('#cosmo-age-month').value = month;
  document.querySelector('#cosmo-age-day').value = day;
  document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

test('the age screen classifies the eighteenth birthday and stores no birth date', async () => {
  const adult = app();
  submit(adult.window, '2008', '11', '28');
  assert.equal(await adult.window.AgeGate.ensure(), 'adult');
  assert.equal(adult.window.document.querySelector('dialog'), null);
  const stored = JSON.parse(adult.window.localStorage.getItem('cosmo.ageGroup.v1'));
  assert.deepEqual(stored, { group: 'adult', checkedAt: now });

  const minor = app();
  submit(minor.window, '2008', '11', '29');
  assert.equal(await minor.window.AgeGate.ensure(), 'minor');
  assert.deepEqual(JSON.parse(minor.window.localStorage.getItem('cosmo.ageGroup.v1')), { group: 'minor', checkedAt: now });
});

test('invalid and future birth dates leave the screen open until a valid date is entered', async () => {
  const { window } = app({ lang: 'ko-KR' });
  assert.match(window.document.querySelector('h1').textContent, /생년월일/);
  submit(window, '2024', '2', '30');
  assert.equal(window.document.querySelector('.age-error').hidden, false);
  assert.equal(window.AgeGate.group, null);
  submit(window, '2026', '11', '29');
  assert.equal(window.AgeGate.group, null);
  submit(window, '2012', '2', '29');
  assert.equal(await window.AgeGate.ensure(), 'minor');
});

test('a saved age result is used for one year and then the user is asked again', async () => {
  const saved = app({ saved: { group: 'minor', checkedAt: now - 1000 } });
  assert.equal(await saved.window.AgeGate.ensure(), 'minor');
  assert.equal(saved.window.document.querySelector('dialog'), null);

  const expired = app({ saved: { group: 'adult', checkedAt: now - 366 * 24 * 60 * 60 * 1000 } });
  assert.equal(expired.window.AgeGate.group, null);
  assert.equal(expired.window.document.querySelector('dialog').hasAttribute('open'), true);
  submit(expired.window, '1990', '1', '1');
  assert.equal(await expired.window.AgeGate.ensure(), 'adult');
});

test('ad requests wait for the screen and a minor can continue without an ad', async () => {
  const { window, calls } = app();
  window.eval(adsSource);
  window.Ads.init();
  const reward = window.Ads.rewarded('continue');
  await Promise.resolve();
  assert.equal(calls.length, 0);
  submit(window, '2010', '5', '1');
  assert.equal(await reward, false);
  assert.equal(window.Ads.canShowAds, false);
  assert.deepEqual(calls, []);
});
