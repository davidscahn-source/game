// 행성 머지 (Planet Merge) — 같은 행성끼리 부딪히면 더 큰 행성으로 합쳐지는 물리 퍼즐
(() => {
'use strict';
const R = [15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 120];
const PTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];
const HUE = [195, 150, 95, 50, 25, 350, 315, 280, 245, 215, 175];
const SPAWN = [0, 0, 0, 1, 1, 1, 2, 2, 3, 4];
const G = 2200, LINE = 168, DROP_Y = 112, WALL = 14;

let balls, cur, next, aimX, cool, score, danger, parts = [], floor;
const pick = () => SPAWN[Math.floor(Math.random() * SPAWN.length)];

const k = Kit.create({
  id: 'merge',
  title: ['행성 머지', 'Planet Merge'],
  tagline: ['같은 행성을 합쳐 더 크게!', 'Merge matching planets!'],
  hint: ['좌우로 끌어 위치를 잡고 손을 떼면 떨어집니다', 'Drag to aim, release to drop'],
  layout() { floor = k.H - 26; },
  start() {
    balls = []; parts = []; score = 0; danger = 0; cool = 0;
    cur = pick(); next = pick(); aimX = k.W / 2;
    k.hud(0);
  },
  down(x) { if (k.state === 'play') aim(x); },
  move(x) { if (k.state === 'play') aim(x); },
  up(x) {
    if (k.state !== 'play' || cool > 0) return;
    aim(x);
    balls.push({ x: aimX, y: DROP_Y, px: aimX, py: DROP_Y - 3, t: cur, r: R[cur], age: 0 });
    cur = next; next = pick(); cool = 0.45;
    aim(aimX);
    k.beep(300, 0.08, 'triangle', 0.07, 200);
  },
  update,
  draw
});

function aim(x) { aimX = Math.max(WALL + R[cur], Math.min(k.W - WALL - R[cur], x)); }

function burst(x, y, hue, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, v = 60 + Math.random() * 200;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, hue });
  }
}

function update(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t += dt * 1.8; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.t > 1) parts.splice(i, 1);
  }
  if (k.state !== 'play') return;
  cool -= dt;
  const SUB = 3, h = dt / SUB;
  for (let s = 0; s < SUB; s++) {
    for (const b of balls) {
      let vx = (b.x - b.px) * 0.992, vy = (b.y - b.py) * 0.992;
      const sp = Math.hypot(vx, vy), cap = 1300 * h;
      if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
      b.px = b.x; b.py = b.y;
      b.x += vx; b.y += vy + G * h * h;
    }
    for (let it = 0; it < 5; it++) {
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (a.dead) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          if (b.dead) continue;
          const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          if (a.t === b.t) { merge(a, b); if (a.dead) break; continue; }
          const d = Math.sqrt(d2) || 0.01, ov = (min - d), nx = dx / d, ny = dy / d;
          const ma = a.r * a.r, mb = b.r * b.r, ra = mb / (ma + mb), rb = ma / (ma + mb);
          a.x -= nx * ov * ra; a.y -= ny * ov * ra;
          b.x += nx * ov * rb; b.y += ny * ov * rb;
          // 밀어낸 만큼 이전 위치도 일부 옮겨, 겹침 해소가 튕겨 나가는 속도로 바뀌지 않게 한다
          a.px -= nx * ov * ra * 0.7; a.py -= ny * ov * ra * 0.7;
          b.px += nx * ov * rb * 0.7; b.py += ny * ov * rb * 0.7;
        }
      }
      for (const b of balls) {
        if (b.x < WALL + b.r) b.x = WALL + b.r;
        if (b.x > k.W - WALL - b.r) b.x = k.W - WALL - b.r;
        if (b.y > floor - b.r) { b.y = floor - b.r; b.px += (b.x - b.px) * 0.08; }
      }
    }
    if (balls.some((b) => b.dead)) balls = balls.filter((b) => !b.dead);
  }
  // 경고선 위로 쌓인 채 2초가 지나면 끝
  let over = false;
  for (const b of balls) { b.age += dt; if (b.age > 1.2 && b.y - b.r < LINE) over = true; }
  danger = over ? danger + dt : Math.max(0, danger - dt * 2);
  if (danger > 2) {
    k.beep(200, 0.45, 'sawtooth', 0.13, 55); k.buzz([30, 40, 60]);
    k.over(score, revive);
  }
}

function merge(a, b) {
  a.dead = b.dead = true;
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, t = a.t + 1;
  burst(x, y, HUE[Math.min(t, 10)], 12);
  if (t > 10) { score += 100; } else {
    balls.push({ x, y, px: x, py: y, t, r: R[t], age: 2 });
    score += PTS[t];
  }
  k.hud(score);
  k.beep(380 + t * 55, 0.16, 'sine', 0.12, 620 + t * 70);
  k.buzz(10);
}
// 이어하기: 작은 행성(1~3단계)을 모두 치운다
function revive() {
  for (const b of balls) if (b.t <= 2) { burst(b.x, b.y, HUE[b.t], 6); b.dead = true; }
  balls = balls.filter((b) => !b.dead);
  balls.forEach((b) => { b.age = 0; });
  danger = 0;
}

function planet(ctx, x, y, r, t, alpha) {
  const hue = HUE[t];
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, `hsl(${hue},90%,78%)`);
  g.addColorStop(1, `hsl(${(hue + 25) % 360},70%,40%)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.font = `800 ${Math.max(11, r * 0.62)}px system-ui,sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t + 1, x, y + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
}

function draw(ctx) {
  if (!balls) return;
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.beginPath(); ctx.roundRect(WALL - 6, LINE - 70, k.W - 2 * WALL + 12, floor - LINE + 76, 18); ctx.fill();
  const warn = danger > 0.3;
  ctx.strokeStyle = warn ? `rgba(255,80,110,${0.5 + 0.5 * Math.sin(k.time * 14)})` : 'rgba(255,255,255,.22)';
  ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(WALL, LINE); ctx.lineTo(k.W - WALL, LINE); ctx.stroke();
  ctx.setLineDash([]);
  for (const b of balls) planet(ctx, b.x, b.y, b.r, b.t, 1);
  if (k.state === 'play') {
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(aimX, DROP_Y); ctx.lineTo(aimX, floor); ctx.stroke();
    planet(ctx, aimX, DROP_Y, R[cur], cur, cool > 0 ? 0.35 : 1);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '600 12px system-ui,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('NEXT', k.W - 44, 76);
    planet(ctx, k.W - 44, 98, Math.min(R[next], 16), next, 1);
  }
  for (const p of parts) {
    ctx.globalAlpha = 1 - p.t; ctx.fillStyle = `hsl(${p.hue},90%,70%)`;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

window.__dbg = () => ({ state: k.state, score, n: balls ? balls.length : 0, max: balls && balls.length ? Math.max(...balls.map((b) => b.t)) : -1, danger });
k.menu();
})();
