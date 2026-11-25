const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('restart restores the original level after the player adds a rewarded tube', () => {
  const math = Object.create(Math);
  math.random = () => 0;
  let options, buttons;
  const game = {
    W: 420, H: 800, state: 'play', save: { best: 0, level: 1 },
    hud() {}, beep() {}, buzz() {}, menu() {},
    rewarded(_name, grant) { grant(); },
    toolbar(items) {
      buttons = Object.fromEntries(items.map((item) => [item.id, item]));
      this.tools = Object.fromEntries(items.map((item) => [item.id, { textContent: '', style: {}, disabled: false }]));
    }
  };
  const window = {};
  vm.runInNewContext(fs.readFileSync('sort/game.js', 'utf8'), {
    window, Math: math, setTimeout,
    Kit: { create: (config) => { options = config; return game; }, KO: true }
  });
  options.start();
  window.__dbg().tap(0);
  window.__dbg().tap(3);
  assert.deepEqual(JSON.parse(JSON.stringify(window.__dbg().tubes)), [[0, 0, 0], [1, 1, 1, 2], [2, 2, 2, 0], [1], []]);
  buttons.tube.fn();
  buttons.reset.fn();
  assert.deepEqual(JSON.parse(JSON.stringify(window.__dbg().tubes)), [[0, 0, 0, 1], [1, 1, 1, 2], [2, 2, 2, 0], [], [], []]);
});
