// 링 러시 (Ring Rush) — 두 궤도를 오가며 장애물을 피하는 고난도 반사신경 게임
(() => {
'use strict';
const R = [92, 150], PR = 9, TAU = Math.PI * 2;
let th, lane, lf, obs, stars, score, genTh, lastSwitch, switchFrom, safe, trail, parts = [], floats = [], cx, cy, dead = 0;

const k = Kit.create({
  id: 'rush',
  daily: true,
  tiers: [15, 35, 60, 100, 150],
  title: ['링 러시', 'Ring Rush'],
  tagline: ['탭해서 궤도를 바꿔 피하세요', 'Tap to switch rings and dodge'],
  hint: ['점점 빨라집니다 · 아슬아슬하게 피하면 보너스!', 'It keeps speeding up · close dodges score bonus!'],
  layout() { cx = k.W / 2; cy = k.H * 0.52; },
  start() {
    th = -Math.PI / 2; lane = 1; lf = 1; obs = []; stars = []; score = 0; trail = []; parts = []; floats = [];
    genTh = th + 2.4; lastSwitch = -9; switchFrom = 1; safe = 0; dead = 0;
    k.setScore(0);
  },
  down() {
    if (k.state !== 'play' || dead) return;
    switchFrom = lane; lane = 1 - lane; lastSwitch = k.time;
    k.beep(lane ? 560 : 440, 0.05, 'triangle', 0.07);
  },
  update,
  draw
});

const speed = () => 1.9 + Math.min(2.7, score * 0.034);
const rnd = (a, b) => a + k.rand() * (b - a);

function generate() {
  const w = speed();
  while (genTh < th + TAU * 0.86) {
    const gap = Math.max(0.4, 0.95 - score * 0.007) * rnd(0.85, 1.3) * w;
    const ln = k.rand() < 0.5 ? 0 : 1;
    const wide = score > 40 && k.rand() < 0.2;
    obs.push({ th: genTh, lane: ln, w: wide ? 0.34 : rnd(0.13, 0.2) });
    // 연속 장애물: 피하자마자 반대쪽에 또 하나
    if (k.rand() < Math.min(0.38, score * 0.007)) {
      genTh += Math.max(0.3, 0.42 - score * 0.001) * w;
      obs.push({ th: genTh, lane: 1 - ln, w: 0.14 });
    } else if (k.rand() < 0.3) {
      stars.push({ th: genTh + gap * 0.5, lane: k.rand() < 0.5 ? 0 : 1 });
    }
    genTh += gap;
  }
}
const at = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

function update(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt * 1.6; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > 1) parts.splice(i, 1); }
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 0.9) floats.splice(i, 1); }
  if (k.state !== 'play') return;
  if (dead) { dead += dt; if (dead > 0.7) { dead = 0; k.over(score, revive); } return; }
  th += speed() * dt;
  lf += Math.sign(lane - lf) * Math.min(Math.abs(lane - lf), dt / 0.085);
  safe -= dt;
  generate();
  const pr = R[0] + (R[1] - R[0]) * lf;
  const [px, py] = at(th, pr);
  trail.push([px, py]); if (trail.length > 14) trail.shift();

  for (const o of obs) {
    const d = th - o.th, half = o.w / 2 + PR / R[o.lane] * 0.6;
    if (Math.abs(d) < half && Math.abs(pr - R[o.lane]) < 20 && safe <= 0) return die(px, py);
    if (d > half && !o.passed) {
      o.passed = true;
      let gain = 1;
      // 장애물 직전에 그 궤도에서 빠져나왔으면 아슬아슬 보너스
      if (k.time - lastSwitch < 0.22 && switchFrom === o.lane) {
        gain = 2;
        floats.push({ x: px, y: py - 22, t: 0, text: k.KO ? '아슬아슬! +2' : 'Close! +2' });
        k.beep(900, 0.1, 'sine', 0.1, 1400);
      } else k.beep(640, 0.04, 'sine', 0.05);
      score += gain;
      k.setScore(score);
    }
  }
  for (const s of stars) {
    if (!s.got && Math.abs(th - s.th) < 0.09 && Math.abs(pr - R[s.lane]) < 22) {
      s.got = true; score += 2; k.setScore(score);
      floats.push({ x: px, y: py - 22, t: 0, text: '⭐ +2' });
      k.beep(1200, 0.09, 'sine', 0.08, 1700);
    }
  }
  obs = obs.filter((o) => th - o.th < 0.6);
  stars = stars.filter((s) => !s.got && th - s.th < 0.4);
}
function die(x, y) {
  dead = 0.001;
  for (let i = 0; i < 30; i++) { const a = Math.random() * TAU, v = 80 + Math.random() * 260; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0 }); }
  k.beep(220, 0.45, 'sawtooth', 0.14, 50); k.buzz([30, 40, 60]);
}
// 이어하기: 앞쪽 장애물을 치우고 잠깐 무적
function revive() {
  obs = obs.filter((o) => o.th - th > 1.6 || o.passed);
  safe = 1.2;
}

function draw(ctx) {
  if (obs == null) return;
  ctx.lineWidth = 2;
  for (const r of R) {
    ctx.strokeStyle = 'rgba(255,255,255,.13)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  }
  const fade = (d) => Math.max(0, Math.min(1, (TAU * 0.86 - d) / 0.5));
  ctx.lineCap = 'round';
  for (const o of obs) {
    const d = o.th - th;
    ctx.globalAlpha = o.passed ? 0.25 : fade(d);
    ctx.strokeStyle = '#ff4f7b'; ctx.shadowColor = '#ff4f7b'; ctx.shadowBlur = 12; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(cx, cy, R[o.lane], o.th - o.w / 2, o.th + o.w / 2); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.lineCap = 'butt';
  for (const s of stars) {
    ctx.globalAlpha = fade(s.th - th);
    const [x, y] = at(s.th, R[s.lane]);
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(x, y, 6 + Math.sin(k.time * 6) * 1.2, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (k.state === 'play' && !dead) {
    trail.forEach((t, i) => {
      ctx.globalAlpha = i / trail.length * 0.5; ctx.fillStyle = '#7df9ff';
      ctx.beginPath(); ctx.arc(t[0], t[1], 2 + 5 * i / trail.length, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = safe > 0 ? 0.5 + 0.5 * Math.sin(k.time * 30) : 1;
    const [px, py] = at(th, R[0] + (R[1] - R[0]) * lf);
    ctx.fillStyle = '#7df9ff'; ctx.shadowColor = '#7df9ff'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(px, py, PR, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  for (const p of parts) { ctx.globalAlpha = 1 - p.t; ctx.fillStyle = '#7df9ff'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
  ctx.textAlign = 'center'; ctx.font = '800 17px system-ui,sans-serif';
  for (const f of floats) { ctx.globalAlpha = 1 - f.t / 0.9; ctx.fillStyle = '#ffe066'; ctx.fillText(f.text, f.x, f.y - f.t * 30); }
  ctx.globalAlpha = 1;
  if (k.state === 'play') {
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.font = '800 54px system-ui,sans-serif';
    ctx.textBaseline = 'middle'; ctx.fillText(score, cx, cy + 2); ctx.textBaseline = 'alphabetic';
  }
}

window.__dbg = () => ({ state: k.state, score, th, lane, lf, obs, R, dead, mode: k.mode });
k.menu();
})();
