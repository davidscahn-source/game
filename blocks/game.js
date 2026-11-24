// 별 블록 (Star Blocks) — 8x8 판에 조각을 끌어다 놓고 줄을 지우는 퍼즐
(() => {
'use strict';
const N = 8;
const BASES = [
  ['#', 1], ['##', 1], ['###', 1], ['####', 1], ['#####', 0.7],
  ['##/##', 1], ['###/###/###', 0.5], ['#./##', 1.2], ['#../#../###', 0.8],
  ['###/.#.', 1], ['##./.##', 0.8], ['#./#./##', 0.9], ['.#/.#/##', 0.9]
];
const parse = (s) => {
  const c = [];
  s.split('/').forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') c.push([x, y]); }));
  return c;
};
const norm = (c) => {
  const mx = Math.min(...c.map((p) => p[0])), my = Math.min(...c.map((p) => p[1]));
  return c.map((p) => [p[0] - mx, p[1] - my]);
};
const rot = (c) => norm(c.map((p) => [-p[1], p[0]]));
function makePiece(bi) {
  let cells = parse(BASES[bi][0]);
  for (let i = Math.floor(k.rand() * 4); i > 0; i--) cells = rot(cells);
  return {
    cells, hue: (bi * 53 + 190) % 360,
    w: Math.max(...cells.map((p) => p[0])) + 1, h: Math.max(...cells.map((p) => p[1])) + 1
  };
}
// 점수가 오를수록 큰 조각이 자주, 작은 조각이 드물게 나온다
const BIG = [4, 6, 8, 9, 10], SMALL = [0, 1];
function randomPiece() {
  const d = Math.min(1, score / 600);
  const wt = BASES.map((b, i) => b[1] * (BIG.includes(i) ? 1 + 1.4 * d : SMALL.includes(i) ? 1 - 0.6 * d : 1));
  let r = k.rand() * wt.reduce((a, b) => a + b, 0);
  for (let i = 0; i < BASES.length; i++) { r -= wt[i]; if (r <= 0) return makePiece(i); }
  return makePiece(0);
}

let grid, tray, drag = null, fx = [], floats = [], score = 0, streak = 0, cs, gx, gy, trayY;

const k = Kit.create({
  id: 'blocks',
  daily: true,
  tiers: [100, 300, 700, 1500, 3000],
  title: ['별 블록', 'Star Blocks'],
  tagline: ['조각을 놓아 줄을 지우세요', 'Place pieces, clear lines'],
  hint: ['한 번에 여러 줄 · 연속으로 지우면 보너스!', 'Multi-line and streak clears score bonus!'],
  layout() {
    cs = (k.W - 36) / N; gx = 18;
    gy = Math.max(84, Math.min(130, k.H * 0.15));
    trayY = gy + N * cs + Math.max(70, (k.H - gy - N * cs) * 0.42);
  },
  start() {
    grid = Array.from({ length: N }, () => Array(N).fill(0));
    score = 0; streak = 0; fx = []; floats = []; drag = null;
    refill();
    k.setScore(0);
  },
  down(x, y) {
    if (k.state !== 'play') return;
    const i = Math.floor(x / (k.W / 3));
    if (y > trayY - 75 && y < trayY + 85 && tray[i]) { drag = { i, x, y }; k.beep(500, 0.05, 'triangle', 0.06); }
  },
  move(x, y) { if (drag) { drag.x = x; drag.y = y; } },
  up() {
    if (!drag) return;
    const p = tray[drag.i], c = dragCell();
    if (c && fits(p, c[0], c[1])) place(drag.i, c[0], c[1]);
    else k.beep(180, 0.08, 'sine', 0.06);
    drag = null;
  },
  update(dt) {
    for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt * 3.2; if (fx[i].t > 1) fx.splice(i, 1); }
    for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; floats[i].y -= 34 * dt; if (floats[i].t > 1) floats.splice(i, 1); }
  },
  draw
});

function fits(p, cx, cy) {
  for (const [x, y] of p.cells) {
    const X = cx + x, Y = cy + y;
    if (X < 0 || Y < 0 || X >= N || Y >= N || grid[Y][X]) return false;
  }
  return true;
}
function fitsAnywhere(p) {
  for (let y = 0; y <= N - p.h; y++) for (let x = 0; x <= N - p.w; x++) if (fits(p, x, y)) return true;
  return false;
}
function refill() {
  for (let tries = 0; tries < 30; tries++) {
    tray = [randomPiece(), randomPiece(), randomPiece()];
    if (tray.some(fitsAnywhere)) break;
  }
}
// 끄는 동안 조각은 손가락 위쪽에 뜬다
function dragCell() {
  const p = tray[drag.i];
  const left = drag.x - p.w * cs / 2, top = drag.y - 90 - p.h * cs / 2;
  const cx = Math.round((left - gx) / cs), cy = Math.round((top - gy) / cs);
  if (cx < -1 || cy < -1 || cx > N || cy > N) return null;
  return [cx, cy];
}
function place(i, cx, cy) {
  const p = tray[i];
  for (const [x, y] of p.cells) grid[cy + y][cx + x] = p.hue + 1;
  score += p.cells.length;
  tray[i] = null;
  const rows = [], cols = [];
  for (let y = 0; y < N; y++) if (grid[y].every(Boolean)) rows.push(y);
  for (let x = 0; x < N; x++) if (grid.every((r) => r[x])) cols.push(x);
  const lines = rows.length + cols.length;
  if (lines) {
    streak += 1;
    const gain = 10 * lines * lines + 10 * (streak - 1);
    score += gain;
    const clear = (x, y) => { if (grid[y][x]) { fx.push({ x, y, hue: grid[y][x] - 1, t: 0 }); grid[y][x] = 0; } };
    rows.forEach((y) => { for (let x = 0; x < N; x++) clear(x, y); });
    cols.forEach((x) => { for (let y = 0; y < N; y++) clear(x, y); });
    floats.push({ x: gx + (cx + p.w / 2) * cs, y: gy + cy * cs, t: 0, text: '+' + gain + (streak > 1 ? '  x' + streak : '') });
    k.beep(520 + lines * 90 + streak * 40, 0.22, 'sine', 0.13, 1100 + lines * 150);
    k.buzz(15);
  } else {
    streak = 0;
    k.beep(330, 0.07, 'triangle', 0.08);
  }
  k.setScore(score);
  if (tray.every((t) => !t)) refill();
  if (!tray.some((t) => t && fitsAnywhere(t))) {
    k.beep(200, 0.4, 'sawtooth', 0.12, 60);
    setTimeout(() => { if (k.state === 'play') k.over(score, revive); }, 500);
  }
}
// 이어하기: 가장 꽉 찬 줄 3개를 지우고 작은 조각을 준다
function revive() {
  const fill = (y) => grid[y].filter(Boolean).length;
  [...Array(N).keys()].sort((a, b) => fill(b) - fill(a)).slice(0, 3).forEach((y) => {
    for (let x = 0; x < N; x++) if (grid[y][x]) { fx.push({ x, y, hue: grid[y][x] - 1, t: 0 }); grid[y][x] = 0; }
  });
  tray = [makePiece(0), makePiece(5), makePiece(1)];
  streak = 0;
}

function cell(ctx, x, y, s, hue, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `hsl(${hue},80%,58%)`;
  ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, s - 3, s - 3, s * 0.18); ctx.fill();
  ctx.fillStyle = `hsla(${hue},95%,82%,.55)`;
  ctx.beginPath(); ctx.roundRect(x + s * 0.14, y + s * 0.12, s * 0.72, s * 0.22, s * 0.1); ctx.fill();
  ctx.globalAlpha = 1;
}
function drawPiece(ctx, p, cx, cy, s, alpha) {
  const ox = cx - p.w * s / 2, oy = cy - p.h * s / 2;
  for (const [x, y] of p.cells) cell(ctx, ox + x * s, oy + y * s, s, p.hue, alpha);
}
function draw(ctx) {
  if (!grid) return;
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.beginPath(); ctx.roundRect(gx - 8, gy - 8, N * cs + 16, N * cs + 16, 16); ctx.fill();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (grid[y][x]) cell(ctx, gx + x * cs, gy + y * cs, cs, grid[y][x] - 1, 1);
    else {
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.beginPath(); ctx.roundRect(gx + x * cs + 1.5, gy + y * cs + 1.5, cs - 3, cs - 3, cs * 0.18); ctx.fill();
    }
  }
  for (const f of fx) {
    const s = cs * (1 - f.t), o = (cs - s) / 2;
    cell(ctx, gx + f.x * cs + o, gy + f.y * cs + o, s, f.hue, 1 - f.t);
  }
  if (drag) {
    const p = tray[drag.i], c = dragCell();
    if (c && fits(p, c[0], c[1])) for (const [x, y] of p.cells) cell(ctx, gx + (c[0] + x) * cs, gy + (c[1] + y) * cs, cs, p.hue, 0.35);
  }
  for (let i = 0; i < 3; i++) {
    const p = tray[i];
    if (!p || (drag && drag.i === i)) continue;
    drawPiece(ctx, p, k.W / 6 + i * k.W / 3, trayY, cs * 0.52, fitsAnywhere(p) ? 1 : 0.3);
  }
  if (drag) drawPiece(ctx, tray[drag.i], drag.x, drag.y - 90, cs, 0.92);
  ctx.textAlign = 'center'; ctx.font = '800 22px system-ui,sans-serif';
  for (const f of floats) {
    ctx.globalAlpha = 1 - f.t; ctx.fillStyle = '#ffe066';
    ctx.fillText(f.text, Math.max(60, Math.min(k.W - 60, f.x)), f.y);
  }
  ctx.globalAlpha = 1;
}

window.__dbg = () => ({ state: k.state, score, grid, tray, N, fits, place: (i, x, y) => place(i, x, y) });
k.menu();
})();
