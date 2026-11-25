const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('shared/share.js', 'utf8');

function setup({ native, clipboard, share, nativeShare } = {}) {
  const cap = native ? { isNativePlatform: () => true, nativePromise: nativeShare } : null;
  const window = { Capacitor: cap, GAME_CONFIG: { publicGameUrl: 'https://davidscahn-source.github.io/game/' } };
  const location = { href: native ? 'https://localhost/rush/index.html' : 'https://example.com/game/rush/index.html' };
  vm.runInNewContext(source, { window, location, navigator: { clipboard, share }, URL, Object, Promise });
  return window.CosmoShare;
}

test('an Android challenge opens native sharing with a public link and score', async () => {
  let shared;
  const app = setup({ native: true, nativeShare: async (_plugin, _method, data) => { shared = data; } });
  const url = app.gameUrl('rush', { vs: 42, daily: 20261125 });
  assert.equal(await app.send({ title: 'Ring Rush', text: 'Beat 42!', url }), 'shared');
  assert.equal(shared.url, 'https://davidscahn-source.github.io/game/rush/index.html?vs=42&daily=20261125');
  assert.equal(shared.text, 'Beat 42!');
});

test('without a web share sheet, the player receives a usable copied challenge', async () => {
  let copied;
  const app = setup({ clipboard: { writeText: async (text) => { copied = text; } } });
  const url = app.gameUrl('blocks', { vs: 17 });
  assert.equal(await app.send({ title: 'Star Blocks', text: 'Beat 17!', url }), 'copied');
  assert.equal(copied, 'Beat 17! https://example.com/game/blocks/index.html?vs=17');
});

test('cancelling a native share leaves without copying or reporting a failure', async () => {
  const app = setup({ native: true, nativeShare: async () => { throw new Error('Share canceled'); } });
  assert.equal(await app.send({ title: 'Game', text: 'Play!', url: app.gameUrl('orbit') }), 'cancelled');
});
