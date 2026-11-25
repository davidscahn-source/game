// 별빛 정렬 (Star Sort) — 같은 색 구슬끼리 한 병에 모으는 레벨형 퍼즐
(() => {
'use strict';
const CAP = 4, TW = 50, SLOT = 42, BR = 19, TH = CAP * SLOT + 14;
const HUES = [0, 205, 120, 48, 280, 25, 320, 170, 95, 235];
const FREE_UNDO = 3;

let tubes, hid, initialTubes, initialHid, mystery, sel = -1, history, undos, extraUsed, level, pos = [], pop = null, shake = null;

const k = Kit.create({
  id: 'sort',
  save: { level: 1 },
  title: ['별빛 정렬', 'Star Sort'],
  tagline: ['같은 색끼리 한 병에 모으세요', 'Sort each color into one tube'],
  hint: ['병을 눌러 구슬을 들고, 다른 병을 눌러 옮기세요', 'Tap a tube to lift, tap another to drop'],
  menuSub: () => (Kit.KO ? '레벨 ' : 'Level ') + k.save.level,
  layout,
  start() { newLevel(); },
  down(x, y) {
    if (k.state !== 'play') return;
    const i = pos.findIndex((p) => x > p.x - TW / 2 - 6 && x < p.x + TW / 2 + 6 && y > p.y - 40 && y < p.y + TH + 10);
    if (i >= 0) tapTube(i);
  },
  update(dt) {
    if (pop) { pop.t += dt * 5; if (pop.t > 1) pop = null; }
    if (shake) { shake.t += dt * 4; if (shake.t > 1) shake = null; }
  },
  draw
});

const lvText = () => (Kit.KO ? '레벨 ' : 'Level ') + level;
const canMove = (ts, a, b) => a !== b && ts[a].length && ts[b].length < CAP &&
  (!ts[b].length || ts[b][ts[b].length - 1] === ts[a][ts[a].length - 1]);
const done = (t) => t.length === 0 || (t.length === CAP && t.every((c) => c === t[0]));
const solved = (ts) => ts.every(done);

// 풀 수 있는 배치인지 확인 (깊이 우선 탐색, 탐색 수 제한)
function solvable(start) {
  const seen = new Set(), stack = [start.map((t) => t.slice())];
  let nodes = 0;
  while (stack.length && nodes < 12000) {
    const ts = stack.pop(); nodes++;
    if (solved(ts)) return true;
    const key = ts.map((t) => t.join(',')).sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    for (let a = 0; a < ts.length; a++) {
      if (!ts[a].length || (ts[a].length === CAP && done(ts[a]))) continue;
      const uniform = ts[a].every((c) => c === ts[a][0]);
      let usedEmpty = false;
      for (let b = 0; b < ts.length; b++) {
        if (!canMove(ts, a, b)) continue;
        if (!ts[b].length) { if (uniform || usedEmpty) continue; usedEmpty = true; }
        const n = ts.map((t) => t.slice());
        n[b].push(n[a].pop());
        stack.push(n);
      }
    }
  }
  return false;
}

function deal(colors) {
  for (let tries = 0; tries < 12; tries++) {
    const bag = [];
    for (let c = 0; c < colors; c++) for (let i = 0; i < CAP; i++) bag.push(c);
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    const ts = [];
    for (let c = 0; c < colors; c++) ts.push(bag.slice(c * CAP, c * CAP + CAP));
    ts.push([], []);
    if (!solved(ts) && solvable(ts)) return ts;
  }
  // 드물게 검증에 실패하면 섞기만 한 배치를 쓴다 (되돌리기·병 추가로 풀 수 있음)
  const ts = [];
  for (let c = 0; c < colors; c++) ts.push([c, (c + 1) % colors, c, (c + 1) % colors]);
  ts.push([], []);
  return ts;
}

function newLevel() {
  level = k.save.level;
  const colors = Math.min(3 + Math.floor((level - 1) / 2), HUES.length - 1);
  tubes = deal(colors);
  // 미스터리 레벨: 맨 위 구슬만 보이고 아래는 꺼내야 드러난다
  mystery = level >= 5 && level % 3 === 2;
  hid = tubes.map((t) => t.map((c, j) => mystery && j < t.length - 1));
  initialTubes = tubes.map((t) => t.slice());
  initialHid = hid.map((t) => t.slice());
  sel = -1; history = []; undos = FREE_UNDO; extraUsed = false;
  layout();
  k.hud(lvText(), mystery ? (Kit.KO ? '❓ 미스터리 레벨' : '❓ Mystery level') : '');
  k.toolbar([
    { id: 'undo', label: '', fn: undo },
    { id: 'tube', label: ['▶ 병 추가', '▶ Add tube'], ad: true, fn: addTube },
    { id: 'reset', label: ['⟲ 다시', '⟲ Restart'], fn: restart }
  ]);
  tools();
}
function tools() {
  if (!k.tools) return;
  k.tools.undo.textContent = undos > 0 ? (Kit.KO ? '↩ 되돌리기 ' : '↩ Undo ') + undos : (Kit.KO ? '▶ 되돌리기 +5' : '▶ Undo +5');
  k.tools.undo.className = undos > 0 ? '' : 'ad';
  k.tools.tube.disabled = extraUsed;
  k.tools.tube.style.opacity = extraUsed ? 0.35 : 1;
}
function layout() {
  if (!tubes) return;
  const n = tubes.length, top = n > 6 ? Math.ceil(n / 2) : n;
  const rows = n > 6 ? [top, n - top] : [n];
  const totalH = rows.length * TH + (rows.length - 1) * 70;
  let y = Math.max(150, (k.H - 70 - totalH) / 2 + 20);
  pos = [];
  for (const cnt of rows) {
    const gap = (k.W - cnt * TW) / (cnt + 1);
    for (let i = 0; i < cnt; i++) pos.push({ x: gap + TW / 2 + i * (TW + gap), y });
    y += TH + 70;
  }
}

function tapTube(i) {
  if (sel < 0) {
    if (tubes[i].length && !(tubes[i].length === CAP && done(tubes[i]))) { sel = i; k.beep(520, 0.05, 'triangle', 0.07); }
    return;
  }
  if (i === sel) { sel = -1; return; }
  if (canMove(tubes, sel, i)) {
    history.push([tubes.map((t) => t.slice()), hid.map((t) => t.slice())]);
    tubes[i].push(tubes[sel].pop()); hid[sel].pop(); hid[i].push(false);
    if (hid[sel].length) hid[sel][hid[sel].length - 1] = false;
    pop = { i, t: 0 }; sel = -1;
    const full = tubes[i].length === CAP && done(tubes[i]);
    k.beep(full ? 760 : 420, full ? 0.22 : 0.07, 'sine', 0.11, full ? 1300 : 0);
    if (full) k.buzz(15);
    if (solved(tubes)) win();
  } else if (tubes[i].length && !(tubes[i].length === CAP && done(tubes[i]))) {
    sel = i; k.beep(520, 0.05, 'triangle', 0.07);
  } else {
    shake = { i, t: 0 }; k.beep(170, 0.08, 'sine', 0.07);
  }
}
function undo() {
  if (!history.length) return;
  if (undos <= 0) return k.rewarded('undo', () => { undos += 5; tools(); });
  [tubes, hid] = history.pop(); undos -= 1; sel = -1; layout(); tools();
}
function addTube() {
  if (extraUsed) return;
  k.rewarded('tube', () => { extraUsed = true; tubes.push([]); hid.push([]); history = []; layout(); tools(); });
}
function restart() {
  tubes = initialTubes.map((t) => t.slice());
  hid = initialHid.map((t) => t.slice());
  if (extraUsed) { tubes.push([]); hid.push([]); }
  history = []; sel = -1; layout();
}
function win() {
  k.state = 'over';
  k.save.best = Math.max(k.save.best, level);
  k.save.level = level + 1;
  k.countPlay();
  k.toolbar([]);
  setTimeout(() => k.panel({
    kicker: Kit.KO ? '✨ 클리어!' : '✨ Cleared!', label: Kit.KO ? '레벨' : 'Level', big: level,
    buttons: [
      { label: Kit.KO ? '다음 레벨' : 'Next level', kind: 'primary', fn: async () => { await k.interstitial(); k.begin(); } },
      { label: '🎮 ' + k.T('home'), href: '../index.html' }
    ]
  }), 450);
}

function ball(ctx, x, y, c, r) {
  const hue = HUES[c];
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, `hsl(${hue},95%,80%)`);
  g.addColorStop(1, `hsl(${hue},80%,45%)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}
function draw(ctx) {
  if (!tubes) return;
  tubes.forEach((t, i) => {
    const p = pos[i]; if (!p) return;
    const sx = shake && shake.i === i ? Math.sin(shake.t * 25) * 5 * (1 - shake.t) : 0;
    const x = p.x + sx, complete = t.length === CAP && done(t);
    ctx.fillStyle = complete ? 'rgba(255,224,102,.12)' : 'rgba(255,255,255,.07)';
    ctx.strokeStyle = sel === i ? '#7df9ff' : complete ? 'rgba(255,224,102,.7)' : 'rgba(255,255,255,.3)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(x - TW / 2, p.y, TW, TH, [6, 6, TW / 2, TW / 2]); ctx.fill(); ctx.stroke();
    t.forEach((c, j) => {
      let by = p.y + TH - 8 - BR - j * SLOT, r = BR;
      const top = j === t.length - 1;
      if (top && sel === i) by = p.y - 26;
      if (top && pop && pop.i === i) r = BR * (1 + 0.25 * Math.sin(pop.t * 3.14));
      if (hid[i][j] && !complete) {
        ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(x, by, r, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '800 18px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', x, by + 6);
      } else ball(ctx, x, by, c, r);
    });
  });
}

window.__dbg = () => ({ state: k.state, level, tubes, hid, mystery, tap: tapTube, CAP });
k.menu();
})();
