(() => {
'use strict';

// ───────── i18n ─────────
const LANG = (() => { try { return new URLSearchParams(location.search).get('lang') || localStorage.getItem('cosmo.lang'); } catch (e) { return null; } })();
const KO = LANG ? LANG === 'ko' : (navigator.language || 'ko').toLowerCase().startsWith('ko');
const STR = {
  title: ['궤도 점프', 'Orbit Leap'],
  tagline: ['탭해서 다음 행성으로!', 'Tap to leap to the next planet!'],
  start: ['시작하기', 'Play'],
  shop: ['상점', 'Shop'],
  best: ['최고', 'Best'],
  score: ['점수', 'Score'],
  retry: ['다시 하기', 'Retry'],
  revive: ['광고 보고 이어하기', 'Watch ad to continue'],
  dbl: ['광고 보고 코인 2배', 'Watch ad: 2x coins'],
  share: ['공유', 'Share'],
  home: ['홈', 'Home'],
  close: ['닫기', 'Close'],
  newbest: ['🎉 신기록!', '🎉 New best!'],
  daily: ['출석 보상', 'Daily reward'],
  streak: ['{n}일 연속 출석', 'Day {n} streak'],
  claim: ['받기', 'Claim'],
  using: ['사용 중', 'Equipped'],
  owned: ['보유', 'Owned'],
  nocoin: ['코인이 부족해요', 'Not enough coins'],
  noad: ['광고를 불러오지 못했어요', 'Ad not available'],
  copied: ['복사됐어요', 'Copied'],
  adph: ['광고 영역 (테스트)', 'Ad placeholder (test)'],
  support: ['☕ 개발자 후원하기', '☕ Support the dev'],
  hint: ['탭 = 발사 · 빠르게 연속으로 뛰면 콤보!', 'Tap = launch · hop quickly for combos!'],
  quick: ['콤보', 'COMBO'],
  privacy: ['개인정보처리방침', 'Privacy Policy'],
  more: ['🎮 다른 게임', '🎮 More games'],
  near: ['😱 최고 기록까지 단 {n}점!', '😱 Just {n} from your best!'],
  shareText: ['궤도 점프에서 {n}점! 이길 수 있어?', 'I scored {n} in Orbit Leap! Can you beat it?'],
  shareFailed: ['공유할 수 없어요', 'Unable to share']
};
const T = (k, v) => {
  let s = (STR[k] || [k, k])[KO ? 0 : 1];
  if (v) for (const key in v) s = s.replace('{' + key + '}', v[key]);
  return s;
};
window.T = T;
document.documentElement.lang = KO ? 'ko' : 'en';
document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = T(el.dataset.t); });

// ───────── 저장 ─────────
const CFG = window.GAME_CONFIG || { ads: {} };
const SAVE_KEY = 'orbitleap.v1';
const save = Object.assign(
  { best: 0, coins: 0, skin: 'cyan', owned: ['cyan'], mute: false, lastDaily: '', streak: 0, games: 0 },
  (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } })()
);
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

const SKINS = [
  { id: 'cyan', name: ['시안', 'Cyan'], price: 0, color: '#7df9ff' },
  { id: 'lime', name: ['라임', 'Lime'], price: 50, color: '#b6ff5c' },
  { id: 'pink', name: ['핑크', 'Pink'], price: 100, color: '#ff8ad1' },
  { id: 'gold', name: ['골드', 'Gold'], price: 200, color: '#ffd24a' },
  { id: 'fire', name: ['파이어', 'Fire'], price: 350, color: '#ff6a3d' },
  { id: 'ghost', name: ['고스트', 'Ghost'], price: 500, color: '#ffffff' },
  { id: 'violet', name: ['바이올렛', 'Violet'], price: 750, color: '#b48cff' },
  { id: 'rainbow', name: ['레인보우', 'Rainbow'], price: 1500, color: 'rainbow' }
];
const skinColor = (id, t) => {
  const s = SKINS.find((k) => k.id === id) || SKINS[0];
  return s.color === 'rainbow' ? `hsl(${(t * 140) % 360},100%,68%)` : s.color;
};

// ───────── DOM ─────────
const $ = (id) => document.getElementById(id);
const app = $('app'), cv = $('cv'), ctx = cv.getContext('2d');
const W = 420;
let H = 746, scale = 1;
function resize() {
  const cw = app.clientWidth, ch = app.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  H = W * ch / cw;
  cv.width = Math.round(cw * dpr);
  cv.height = Math.round(ch * dpr);
  scale = cv.width / W;
}
window.addEventListener('resize', resize);
resize();

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 1600);
}
const setCoins = () => { $('coinNum').textContent = save.coins; };

// ───────── 사운드 ─────────
let ac = null;
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (ac && ac.state === 'suspended' && !adPlaying) ac.resume();
  return ac;
}
function beep(freq, dur, type, vol, slide) {
  if (save.mute || adPlaying) return;
  const a = audio();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime + dur);
  g.gain.setValueAtTime(vol || 0.12, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}
const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

let adPlaying = false;
Ads.hooks.onStart = () => { adPlaying = true; if (ac) ac.suspend(); };
Ads.hooks.onEnd = () => { adPlaying = false; if (ac && !save.mute) ac.resume(); };
Ads.init();

// ───────── 게임 상태 ─────────
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let state = 'menu'; // menu | play | dying | over
let planets, stars, parts, floats, bgStars;
let pl, camY, voidY, score, combo, maxIdx, runCoins, started, revived, doubled, adThisRun, time = 0, dieT = 0, shake = 0;

function makePlanet(i) {
  const prev = planets[planets.length - 1];
  const d = Math.min(1, i / 40);
  const r = lerp(34, 20, d) + rand(-3, 3);
  let x = W / 2, y = 0;
  if (prev) {
    y = prev.y - rand(150, 200 + 40 * d);
    for (let k = 0; k < 20; k++) {
      x = rand(64, W - 64);
      const dx = Math.abs(x - prev.bx);
      if (dx > 40 && dx < 200) break;
    }
  }
  const p = {
    idx: i, bx: x, x, y, r, orbitR: r + 16, capR: r + 40,
    w: lerp(2.5, 4.0, d) * rand(0.92, 1.08),
    hue: (200 + i * 47) % 360, amp: 0, f: 0, ph: 0, src: false, pulse: 0
  };
  if (i > 10 && Math.random() < 0.15 + 0.35 * d) {
    p.amp = Math.min(rand(25, 65), p.bx - 60, W - 60 - p.bx);
    p.f = rand(0.7, 1.3);
    p.ph = rand(0, 6.28);
  }
  planets.push(p);
  if (prev && Math.random() < 0.65) {
    // 발사 궤적은 행성 중심선에서 옆으로 비켜 지나가므로 별도 한쪽으로 치우쳐 둔다
    const t = rand(0.4, 0.6), dx = p.bx - prev.bx, dy = p.y - prev.y, len = Math.hypot(dx, dy);
    const off = rand(18, 32) * (Math.random() < 0.5 ? -1 : 1);
    stars.push({ x: clamp(lerp(prev.bx, p.bx, t) - dy / len * off, 20, W - 20), y: lerp(prev.y, p.y, t) + dx / len * off, got: false });
  }
}

function attach(p, a, s, R) {
  pl.mode = 'orbit'; pl.p = p; pl.a = a; pl.s = s; pl.R = R; pl.landT = 0;
}

function reset() {
  planets = []; stars = []; parts = []; floats = [];
  for (let i = 0; i < 8; i++) makePlanet(i);
  pl = { mode: 'orbit', x: 0, y: 0, vx: 0, vy: 0, trail: [], flyT: 0, quick: false, landT: 99 };
  attach(planets[0], -Math.PI / 2, 1, planets[0].orbitR);
  pl.landT = 99;
  camY = -H * 0.62;
  voidY = H * 0.55;
  score = 0; combo = 0; maxIdx = 0; runCoins = 0;
  started = false; revived = false; doubled = false; adThisRun = false;
}

bgStars = [];
for (let i = 0; i < 70; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * 1200, z: rand(0.15, 0.6), s: rand(0.6, 1.8) });

function burst(x, y, color, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28), v = rand(0.3, 1) * sp;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rand(0.35, 0.8), color, s: rand(1.5, 4) });
  }
}
function floatText(x, y, text, color) { floats.push({ x, y, text, color, t: 0 }); }

function tap() {
  if (state !== 'play' || adPlaying) return;
  audio();
  if (pl.mode !== 'orbit') return;
  const p = pl.p;
  const sp = 520 + 110 * Math.min(1, maxIdx / 40);
  pl.vx = pl.s * -Math.sin(pl.a) * sp;
  pl.vy = pl.s * Math.cos(pl.a) * sp;
  pl.mode = 'fly';
  pl.flyT = 0;
  pl.quick = pl.landT < 0.9;
  p.src = true;
  started = true;
  beep(420 + Math.min(combo, 8) * 60, 0.12, 'triangle', 0.1, 700 + combo * 60);
}

function land(p) {
  const dx = pl.x - p.x, dy = pl.y - p.y;
  const cross = dx * pl.vy - dy * pl.vx;
  attach(p, Math.atan2(dy, dx), cross >= 0 ? 1 : -1, Math.hypot(dx, dy));
  p.pulse = 1;
  const col = `hsl(${p.hue},90%,70%)`;
  burst(pl.x, pl.y, col, 10, 160);
  if (p.idx > maxIdx) {
    const gained = p.idx - maxIdx;
    maxIdx = p.idx;
    combo = pl.quick ? combo + 1 : 0;
    const bonus = Math.min(combo, 5);
    score += gained + bonus;
    floatText(p.x, p.y - p.r - 30, '+' + (gained + bonus), '#fff');
    if (combo > 0) {
      floatText(p.x, p.y - p.r - 54, '⭐ +1', '#ffe066');
      save.coins += 1; runCoins += 1; setCoins(); // 콤보 보너스 코인
    }
    beep(520 + Math.min(combo, 8) * 70, 0.16, 'sine', 0.13, 880 + combo * 70);
    buzz(12);
  } else {
    combo = 0;
    beep(300, 0.1, 'sine', 0.08);
  }
  while (planets[planets.length - 1].idx < maxIdx + 7) makePlanet(planets[planets.length - 1].idx + 1);
}

function die() {
  if (state !== 'play') return;
  state = 'dying';
  dieT = 0;
  shake = 1;
  burst(pl.x, pl.y, skinColor(save.skin, time), 34, 320);
  beep(220, 0.45, 'sawtooth', 0.14, 50);
  buzz([30, 40, 60]);
}

function update(dt) {
  time += dt;
  for (const p of planets) {
    if (p.amp) p.x = p.bx + Math.sin(time * p.f + p.ph) * p.amp;
    p.pulse = Math.max(0, p.pulse - dt * 3);
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96;
    if (q.t > q.life) parts.splice(i, 1);
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    floats[i].t += dt; floats[i].y -= 40 * dt;
    if (floats[i].t > 0.9) floats.splice(i, 1);
  }
  shake = Math.max(0, shake - dt * 2.5);

  if (state === 'dying') {
    dieT += dt;
    if (dieT > 0.75) showOver();
    return;
  }

  // 궤도 회전 (메뉴에서도 데모로 돈다)
  if (pl.mode === 'orbit') {
    const p = pl.p;
    pl.a += pl.s * p.w * dt;
    pl.R = lerp(pl.R, p.orbitR, 1 - Math.exp(-10 * dt));
    pl.x = p.x + Math.cos(pl.a) * pl.R;
    pl.y = p.y + Math.sin(pl.a) * pl.R;
    pl.landT += dt;
  }
  if (state !== 'play') {
    camY = lerp(camY, pl.p.y - H * 0.62, 1 - Math.exp(-5 * dt));
    return;
  }

  if (pl.mode === 'fly') {
    pl.flyT += dt;
    const steps = 3;
    for (let k = 0; k < steps && pl.mode === 'fly'; k++) {
      pl.x += pl.vx * dt / steps;
      pl.y += pl.vy * dt / steps;
      if (pl.x < 8) { pl.x = 8; pl.vx = Math.abs(pl.vx); beep(260, 0.05, 'square', 0.04); }
      if (pl.x > W - 8) { pl.x = W - 8; pl.vx = -Math.abs(pl.vx); beep(260, 0.05, 'square', 0.04); }
      for (const p of planets) {
        const d = Math.hypot(pl.x - p.x, pl.y - p.y);
        if (p.src) { if (d > p.capR + 12) p.src = false; continue; }
        if (d < p.capR) { land(p); break; }
      }
    }
    if (pl.mode === 'fly' && pl.flyT > 2.4) return die();
  }

  // 별 수집
  for (const s of stars) {
    if (!s.got && Math.hypot(pl.x - s.x, pl.y - s.y) < 34) {
      s.got = true;
      save.coins += 1; runCoins += 1;
      setCoins();
      burst(s.x, s.y, '#ffe066', 8, 140);
      beep(1200, 0.09, 'sine', 0.08, 1700);
    }
  }

  // 꼬리
  pl.trail.push({ x: pl.x, y: pl.y });
  if (pl.trail.length > 16) pl.trail.shift();

  // 카메라
  if (pl.mode === 'orbit') camY = lerp(camY, pl.p.y - H * 0.62, 1 - Math.exp(-5 * dt));
  else camY = Math.min(camY, pl.y - H * 0.3);

  // 밀려오는 공허
  if (started) voidY -= Math.min(95, 28 + score * 1.5) * dt;
  voidY = Math.min(voidY, camY + H + 130);
  if (pl.y > voidY - 6) return die();

  // 정리
  while (planets.length && planets[0].y > camY + H + 500 && planets[0] !== pl.p) planets.shift();
  while (stars.length && stars[0].y > camY + H + 500) stars.shift();
}

// ───────── 렌더 ─────────
function draw() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0a22');
  g.addColorStop(1, '#1a1040');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  for (const s of bgStars) {
    const y = (((s.y - camY * s.z) % 1200) + 1200) % 1200;
    if (y > H) continue;
    ctx.globalAlpha = s.z;
    ctx.fillRect(s.x, y, s.s, s.s);
  }
  ctx.globalAlpha = 1;

  ctx.save();
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 8, rand(-1, 1) * shake * 8);
  ctx.translate(0, -camY);

  // 행성
  for (const p of planets) {
    if (p.y < camY - 80 || p.y > camY + H + 80) continue;
    ctx.strokeStyle = `hsla(${p.hue},90%,75%,${0.22 + p.pulse * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.capR, 0, 6.2832); ctx.stroke();
    ctx.setLineDash([]);
    const rr = p.r * (1 + p.pulse * 0.12);
    const pg = ctx.createRadialGradient(p.x - rr * 0.35, p.y - rr * 0.35, rr * 0.1, p.x, p.y, rr);
    pg.addColorStop(0, `hsl(${p.hue},90%,78%)`);
    pg.addColorStop(1, `hsl(${(p.hue + 30) % 360},70%,42%)`);
    ctx.fillStyle = pg;
    ctx.shadowColor = `hsl(${p.hue},90%,60%)`;
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.2832); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 별
  for (const s of stars) {
    if (s.got) continue;
    const b = 1 + Math.sin(time * 5 + s.x) * 0.12;
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 4 : 9) * b;
      ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 플레이어
  const col = skinColor(save.skin, time);
  if (state === 'play' || state === 'menu') {
    for (let i = 0; i < pl.trail.length; i++) {
      const t = pl.trail[i];
      ctx.globalAlpha = (i / pl.trail.length) * 0.5;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(t.x, t.y, 2 + 4 * i / pl.trail.length, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (pl.mode === 'orbit' && state === 'play') {
      const tx = pl.s * -Math.sin(pl.a), ty = pl.s * Math.cos(pl.a);
      ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(pl.x + tx * 12, pl.y + ty * 12); ctx.lineTo(pl.x + tx * 80, pl.y + ty * 80); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(pl.x, pl.y, 7.5, 0, 6.2832); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 파티클 / 떠오르는 텍스트
  for (const q of parts) {
    ctx.globalAlpha = 1 - q.t / q.life;
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
  }
  ctx.textAlign = 'center';
  for (const f of floats) {
    ctx.globalAlpha = 1 - f.t / 0.9;
    ctx.fillStyle = f.color;
    ctx.font = '800 20px system-ui,sans-serif';
    ctx.fillText(f.text, clamp(f.x, 50, W - 50), f.y);
  }
  ctx.globalAlpha = 1;

  // 공허
  const vy = voidY;
  if (vy < camY + H + 20) {
    const vg = ctx.createLinearGradient(0, vy - 30, 0, vy + 160);
    vg.addColorStop(0, 'rgba(255,60,120,0)');
    vg.addColorStop(0.2, 'rgba(255,60,120,.75)');
    vg.addColorStop(1, 'rgba(90,0,60,1)');
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.moveTo(0, camY + H + 40);
    for (let x = 0; x <= W; x += 14) ctx.lineTo(x, vy - 14 + Math.sin(x * 0.045 + time * 3) * 7);
    ctx.lineTo(W, camY + H + 40);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // 점수
  if (state === 'play' || state === 'dying') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = '800 64px system-ui,sans-serif';
    ctx.fillText(score, W / 2, 118);
    if (combo > 0) {
      ctx.fillStyle = '#ffe066';
      ctx.font = '800 18px system-ui,sans-serif';
      ctx.fillText(`${T('quick')} x${combo}`, W / 2, 144);
    }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (!adPlaying) update(dt);
  draw();
  requestAnimationFrame(frame);
}

// ───────── 화면 전환 ─────────
function show(id) {
  ['menu', 'over'].forEach((s) => { $(s).hidden = s !== id; });
}
function start() {
  reset();
  state = 'play';
  show(null);
}
function goMenu() {
  reset();
  state = 'menu';
  $('menuBest').textContent = save.best;
  show('menu');
}
function showOver() {
  state = 'over';
  const isBest = score > save.best;
  if (isBest) save.best = score;
  save.games += 1;
  persist();
  const gap = save.best - score, near = !isBest && save.best > 5 && gap <= Math.max(2, save.best * 0.12);
  $('newBest').textContent = near ? T('near', { n: gap + 1 }) : T('newbest');
  $('newBest').hidden = !(near || (isBest && score > 0));
  $('overScore').textContent = score;
  $('overBest').textContent = save.best;
  $('overCoins').textContent = runCoins;
  $('btnRevive').hidden = revived || score < 3;
  $('btnDouble').hidden = doubled || runCoins < 1;
  show('over');
}
function revive() {
  revived = true;
  const p = planets.find((q) => q.idx === maxIdx) || planets[planets.length - 1];
  planets.forEach((q) => { q.src = false; });
  pl.trail = [];
  attach(p, -Math.PI / 2, 1, p.orbitR);
  pl.landT = 99;
  combo = 0;
  camY = p.y - H * 0.62;
  voidY = p.y + H * 0.7;
  started = false;
  state = 'play';
  show(null);
}

$('btnStart').onclick = () => { audio(); start(); };
$('btnHome').onclick = goMenu;
$('btnRetry').onclick = async () => {
  const every = (CFG.ads && CFG.ads.interstitialEvery) || 3;
  if (!adThisRun && save.games % every === 0) await Ads.interstitial('retry');
  start();
};
$('btnRevive').onclick = async () => {
  const ok = await Ads.rewarded('revive');
  adThisRun = true;
  if (ok) revive(); else toast(T('noad'));
};
$('btnDouble').onclick = async () => {
  const ok = await Ads.rewarded('double');
  adThisRun = true;
  if (!ok) return toast(T('noad'));
  doubled = true;
  save.coins += runCoins;
  persist(); setCoins();
  $('overCoins').textContent = runCoins * 2;
  $('btnDouble').hidden = true;
};
$('btnShare').onclick = async () => {
  const text = T('shareText', { n: score });
  const url = CosmoShare.gameUrl('orbit');
  const result = await CosmoShare.send({ text, url, title: T('title') });
  if (result === 'copied') toast(T('copied'));
  else if (result === 'failed') toast(T('shareFailed'));
};
$('btnSound').onclick = () => {
  save.mute = !save.mute; persist();
  $('btnSound').textContent = save.mute ? '🔇' : '🔊';
};
$('btnSound').textContent = save.mute ? '🔇' : '🔊';
if (CFG.supportUrl) { $('btnSupport').href = CFG.supportUrl; $('btnSupport').hidden = false; }

// 상점
function renderShop() {
  const grid = $('shopGrid');
  grid.innerHTML = '';
  for (const s of SKINS) {
    const own = save.owned.includes(s.id), on = save.skin === s.id;
    const b = document.createElement('button');
    b.className = 'skin' + (on ? ' on' : '') + (own ? '' : ' locked');
    const bg = s.color === 'rainbow' ? 'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)' : s.color;
    b.innerHTML = `<div class="dot" style="background:${bg};box-shadow:0 0 14px ${s.color === 'rainbow' ? '#fff' : s.color}"></div>` +
      `${s.name[KO ? 0 : 1]}<span class="price">${on ? T('using') : own ? T('owned') : '⭐ ' + s.price}</span>`;
    b.onclick = () => {
      if (!own) {
        if (save.coins < s.price) return toast(T('nocoin'));
        save.coins -= s.price;
        save.owned.push(s.id);
        beep(880, 0.2, 'sine', 0.12, 1500);
      }
      save.skin = s.id;
      persist(); setCoins(); renderShop();
    };
    grid.appendChild(b);
  }
}
const openShop = () => { renderShop(); $('shop').hidden = false; };
$('btnShop').onclick = openShop;
$('btnShop2').onclick = openShop;
$('btnShopClose').onclick = () => { $('shop').hidden = true; };

// 출석 보상
function dayStr(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function checkDaily() {
  const today = dayStr(new Date());
  if (save.lastDaily === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const streak = save.lastDaily === dayStr(y) ? save.streak + 1 : 1;
  const amt = 20 + 10 * Math.min(streak, 7);
  $('dailyStreak').textContent = T('streak', { n: streak });
  $('dailyAmt').textContent = amt;
  $('daily').hidden = false;
  $('btnClaim').onclick = () => {
    save.lastDaily = today; save.streak = streak; save.coins += amt;
    persist(); setCoins();
    beep(700, 0.25, 'sine', 0.12, 1400);
    $('daily').hidden = true;
  };
}

// 입력
cv.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.code !== 'Enter') return;
  if (e.repeat) return;
  e.preventDefault();
  if (!$('shop').hidden || !$('daily').hidden || adPlaying) return;
  if (state === 'play') tap();
  else if (state === 'menu') $('btnStart').click();
  else if (state === 'over') $('btnRetry').click();
});
window.addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); last = performance.now(); });

if (!Ads.isNative && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('../sw.js').catch(() => {});
}

// 자동 테스트용 읽기 전용 스냅샷
window.__orbit = () => ({ state, score, combo, coins: save.coins, pl, planets, voidY, camY });

setCoins();
goMenu();
checkDaily();
requestAnimationFrame(frame);
})();
