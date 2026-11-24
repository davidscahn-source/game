// 코스모 아케이드 공용 틀: 화면(메뉴/게임오버), 저장, 소리, 광고 흐름, 캔버스 루프
window.Kit = (() => {
  'use strict';
  const KO = (navigator.language || 'ko').toLowerCase().startsWith('ko');
  const L = (p) => (Array.isArray(p) ? p[KO ? 0 : 1] : p);
  const STR = {
    start: ['시작하기', 'Play'], retry: ['다시 하기', 'Retry'],
    revive: ['광고 보고 이어하기', 'Watch ad to continue'],
    share: ['공유', 'Share'], home: ['다른 게임', 'More games'],
    best: ['최고', 'Best'], score: ['점수', 'Score'], newbest: ['🎉 신기록!', '🎉 New best!'],
    noad: ['광고를 불러오지 못했어요', 'Ad not available'], copied: ['복사됐어요', 'Copied'],
    adph: ['광고 영역 (테스트)', 'Ad placeholder (test)'], privacy: ['개인정보처리방침', 'Privacy Policy'],
    daily: ['📅 오늘의 도전', '📅 Daily challenge'], dailyLbl: ['오늘의 도전', 'Daily challenge'],
    todayBest: ['오늘 최고', "Today's best"], dailyHint: ['오늘은 모두 같은 판! 점수를 공유해 겨뤄 보세요', 'Same board for everyone today. Share and compare!'],
    vsMenu: ['⚔️ 친구 기록 {n}점에 도전!', '⚔️ Beat your friend: {n}!'], vsWin: ['🏆 친구 기록 {n}점을 이겼어요!', "🏆 You beat your friend's {n}!"],
    vsLose: ['⚔️ 친구 기록까지 {n}점 부족', '⚔️ {n} short of your friend'], vsPass: ['⚔️ 친구 기록 돌파!', '⚔️ Passed your friend!'],
    near: ['😱 최고 기록까지 단 {n}점!', '😱 Just {n} from your best!'], chase: ['🔥 최고 기록까지 {n}점!', '🔥 {n} to your best!'],
    passing: ['🎉 신기록 갱신 중!', '🎉 New record run!'], toNext: ['{t}까지 {n}점', '{n} to {t}'],
    challenge: ['친구에게 도전장', 'Challenge a friend']
  };
  const T = (k, v) => { let x = L(STR[k] || k); if (v) for (const i in v) x = x.replace('{' + i + '}', v[i]); return x; };
  window.T = T;
  const TIERS = [['루키', 'Rookie'], ['🥉 브론즈', '🥉 Bronze'], ['🥈 실버', '🥈 Silver'], ['🥇 골드', '🥇 Gold'], ['💠 플래티넘', '💠 Platinum'], ['💎 다이아', '💎 Diamond'], ['👑 마스터', '👑 Master']];
  const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  // 시드 고정 난수 (오늘의 도전은 모든 사람이 같은 판)
  const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const load = (key, def) => {
    try { return Object.assign(def, JSON.parse(localStorage.getItem(key)) || {}); } catch (e) { return def; }
  };

  function create(o) {
    const CFG = window.GAME_CONFIG || { ads: {} };
    document.documentElement.lang = KO ? 'ko' : 'en';
    document.title = L(o.title) + ' · Cosmo Arcade';
    const app = document.getElementById('app');
    app.innerHTML = '<canvas id="cv"></canvas>' +
      '<div id="hud"><a class="chip" href="../index.html" aria-label="home">‹</a><div id="hudMid"></div><button class="chip" id="snd"></button></div>' +
      '<div id="bar" hidden></div><section id="panel" class="screen" hidden></section><div id="toast" hidden></div>' +
      '<div id="adMock" hidden><div id="adMockText"></div><div id="adMockCount"></div></div>';
    const $ = (id) => document.getElementById(id);
    const cv = $('cv'), ctx = cv.getContext('2d');
    const saveKey = 'cosmo.' + o.id;
    const save = load(saveKey, Object.assign({ best: 0 }, o.save || {}));
    const common = load('cosmo.common', { mute: false, plays: 0 });
    const k = { W: 420, H: 746, ctx, save, state: 'menu', revived: false, adThisRun: false, KO, L, T, mode: 'normal', rand: Math.random };
    if (!save.daily || save.daily.date !== today()) save.daily = { date: today(), best: 0 };
    // 친구 도전 링크: ?vs=점수 (&daily=날짜 면 같은 판으로 대결)
    const q = new URLSearchParams(location.search);
    k.vs = Math.max(0, parseInt(q.get('vs'), 10) || 0);
    const vsDaily = k.vs > 0 && parseInt(q.get('daily'), 10) === today();
    const tierOf = (sc) => { let i = 0; while (o.tiers && i < o.tiers.length && sc >= o.tiers[i]) i++; return i; };
    const tierText = (sc) => {
      if (!o.tiers) return '';
      const i = tierOf(sc);
      return L(TIERS[i]) + (i < o.tiers.length ? ' · ' + T('toNext', { t: L(TIERS[i + 1]), n: o.tiers[i] - sc }) : '');
    };
    k.persist = () => {
      try { localStorage.setItem(saveKey, JSON.stringify(save)); localStorage.setItem('cosmo.common', JSON.stringify(common)); } catch (e) {}
    };

    let scale = 1, ready = false;
    function resize() {
      const cw = app.clientWidth, ch = app.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      k.H = k.W * ch / cw;
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
      scale = cv.width / k.W;
      if (o.layout && ready) o.layout();
    }
    window.addEventListener('resize', resize);

    // 소리
    let ac = null, adPlaying = false;
    const audio = () => {
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      if (ac && ac.state === 'suspended' && !adPlaying) ac.resume();
      return ac;
    };
    k.beep = (freq, dur, type, vol, slide) => {
      if (common.mute || adPlaying) return;
      const a = audio(); if (!a) return;
      const osc = a.createOscillator(), g = a.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, a.currentTime);
      if (slide) osc.frequency.exponentialRampToValueAtTime(slide, a.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.12, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      osc.connect(g).connect(a.destination); osc.start(); osc.stop(a.currentTime + dur);
    };
    k.buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
    const sndBtn = $('snd');
    const sndIcon = () => { sndBtn.textContent = common.mute ? '🔇' : '🔊'; };
    sndBtn.onclick = () => { common.mute = !common.mute; k.persist(); sndIcon(); };
    sndIcon();

    Ads.hooks.onStart = () => { adPlaying = true; if (ac) ac.suspend(); };
    Ads.hooks.onEnd = () => { adPlaying = false; if (ac && !common.mute) ac.resume(); };
    Ads.init();

    k.toast = (msg) => {
      const el = $('toast'); el.textContent = msg; el.hidden = false;
      clearTimeout(k.toast.t); k.toast.t = setTimeout(() => { el.hidden = true; }, 1600);
    };
    k.hud = (main, small) => { $('hudMid').innerHTML = main + (small ? '<small>' + small + '</small>' : ''); };
    // 점수 표시 + 승부욕 자극: 목표(친구 기록 → 내 최고)까지 남은 점수를 계속 보여 준다
    let flags = {};
    k.setScore = (n) => {
      const ref = k.mode === 'daily' ? save.daily.best : save.best;
      let small = '';
      if (k.vs && n <= k.vs) small = '⚔️ ' + k.vs;
      else if (ref) small = (k.mode === 'daily' ? T('todayBest') : T('best')) + ' ' + Math.max(ref, n);
      k.hud(n, small);
      if (k.state !== 'play') return;
      if (k.vs && n > k.vs && !flags.vs) { flags.vs = 1; k.toast(T('vsPass')); k.beep(880, 0.25, 'sine', 0.12, 1500); }
      if (ref > 5 && n > ref && !flags.pass) { flags.pass = 1; k.toast(T('passing')); k.beep(990, 0.3, 'sine', 0.12, 1700); }
      else if (ref > 10 && n >= ref * 0.85 && n < ref && !flags.chase) { flags.chase = 1; k.toast(T('chase', { n: ref - n })); }
    };

    // 보상형 광고를 끝까지 보면 fn 실행
    k.rewarded = async (name, fn) => {
      const ok = await Ads.rewarded(name);
      k.adThisRun = true;
      if (ok) fn(); else k.toast(T('noad'));
    };
    // N판마다 전면 광고 (보상형을 본 판은 생략)
    k.interstitial = async () => {
      const every = (CFG.ads && CFG.ads.interstitialEvery) || 3;
      if (!k.adThisRun && common.plays > 0 && common.plays % every === 0) await Ads.interstitial(o.id);
    };

    // 하단 도구 버튼
    k.toolbar = (items) => {
      const bar = $('bar'); bar.innerHTML = ''; bar.hidden = !items.length;
      k.tools = {};
      for (const it of items) {
        const b = document.createElement('button');
        b.textContent = L(it.label); if (it.ad) b.className = 'ad';
        b.onclick = () => { audio(); if (k.state === 'play') it.fn(); };
        bar.appendChild(b); k.tools[it.id] = b;
      }
    };

    // 범용 패널
    const panel = $('panel');
    k.closePanel = () => { panel.hidden = true; };
    k.panel = (p) => {
      panel.innerHTML = '';
      const add = (tag, cls, text, parent) => {
        const el = document.createElement(tag); if (cls) el.className = cls;
        if (text != null) el.textContent = text; (parent || panel).appendChild(el); return el;
      };
      if (p.kicker) add('p', 'kicker', p.kicker);
      if (p.title) add('h1', '', p.title);
      if (p.label) add('p', 'lbl', p.label);
      if (p.big != null) add('p', 'num', p.big);
      if (p.tag) add('p', 'tag', p.tag);
      if (p.sub) add('p', 'sub', p.sub);
      const mk = (b, parent) => {
        const el = add(b.href ? 'a' : 'button', 'btn ' + (b.kind || ''), b.label, parent);
        if (b.href) el.href = b.href; else el.onclick = () => { audio(); b.fn(); };
      };
      for (const b of p.buttons.filter(Boolean)) {
        if (Array.isArray(b)) { const row = add('div', 'row'); b.forEach((x) => mk(Object.assign({}, x, { kind: 'small' }), row)); } else mk(b);
      }
      if (p.hint) add('p', 'hint', p.hint);
      if (p.privacy) { const a = add('a', 'privacy', T('privacy')); a.href = '../privacy.html'; }
      panel.hidden = false;
    };

    const begin = (mode) => {
      if (mode) k.mode = mode;
      k.revived = false; k.adThisRun = false; flags = {};
      k.rand = k.mode === 'daily' ? mulberry(today() * 31 + o.id.length * 7919 + o.id.charCodeAt(0)) : Math.random;
      k.closePanel(); k.state = 'play'; o.start();
    };
    k.begin = () => begin();
    k.menu = () => {
      k.state = 'menu';
      k.panel({
        kicker: k.vs ? T('vsMenu', { n: k.vs }) : '',
        title: L(o.title), tag: L(o.tagline),
        sub: o.menuSub ? o.menuSub() : T('best') + ' ' + save.best + (o.tiers && save.best ? ' · ' + L(TIERS[tierOf(save.best)]) : ''),
        buttons: [
          { label: T('start'), kind: 'primary', fn: () => begin(vsDaily ? 'daily' : 'normal') },
          o.daily && { label: T('daily') + (save.daily.best ? ' · ' + save.daily.best : ''), fn: () => begin('daily') },
          { label: '🎮 ' + T('home'), href: '../index.html' }
        ],
        hint: L(o.hint), privacy: true
      });
    };
    // 공유 링크에 내 점수를 실어 보내면, 받은 친구 화면에 "이 기록에 도전" 목표가 뜬다
    const share = async (score) => {
      const daily = k.mode === 'daily';
      const d = new Date();
      const text = L(o.title) + (daily ? ' ' + T('dailyLbl') + ' ' + (d.getMonth() + 1) + '/' + d.getDate() : '') +
        ' — ' + score + (KO ? '점! 이길 수 있어?' : ' points! Can you beat it?');
      const url = location.origin + location.pathname + '?vs=' + score + (daily ? '&daily=' + today() : '');
      try {
        if (navigator.share) await navigator.share({ text, url });
        else { await navigator.clipboard.writeText(text + ' ' + url); k.toast(T('copied')); }
      } catch (e) {}
    };
    // 게임오버: revive 함수를 주면 한 판에 한 번 "광고 보고 이어하기" 제공
    k.over = (score, revive) => {
      k.state = 'over';
      const daily = k.mode === 'daily';
      const prev = daily ? save.daily.best : save.best;
      const nb = score > prev;
      if (daily) { if (nb) save.daily.best = score; } else if (nb) save.best = score;
      if (daily && score > save.best) save.best = score;
      common.plays += 1; k.persist();
      const gap = prev - score;
      let kicker = '';
      if (k.vs) kicker = score > k.vs ? T('vsWin', { n: k.vs }) : T('vsLose', { n: k.vs - score + 1 });
      else if (nb && score > 0) kicker = T('newbest');
      else if (!nb && prev > 5 && gap <= Math.max(3, prev * 0.12)) kicker = T('near', { n: gap + 1 });
      k.panel({
        kicker, label: daily ? T('dailyLbl') : T('score'), big: score,
        sub: (daily ? T('todayBest') : T('best')) + ' ' + (daily ? save.daily.best : save.best),
        tag: tierText(Math.max(score, save.best)),
        buttons: [
          // 오늘의 도전은 공정한 비교를 위해 이어하기 없음
          revive && !daily && !k.revived && { label: T('revive'), kind: 'ad', fn: () => k.rewarded('revive', () => { k.revived = true; k.closePanel(); k.state = 'play'; revive(); }) },
          { label: T('retry'), kind: 'primary', fn: async () => { await k.interstitial(); begin(); } },
          [{ label: '⚔️ ' + T('challenge'), fn: () => share(score) }, { label: T('home'), href: '../index.html' }]
        ],
        hint: daily ? T('dailyHint') : ''
      });
    };
    k.countPlay = () => { common.plays += 1; k.persist(); };

    // 입력 (논리 좌표로 변환)
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * k.W / r.width, (e.clientY - r.top) * k.W / r.width]; };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); audio(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (o.down && !adPlaying) o.down(...pos(e)); });
    cv.addEventListener('pointermove', (e) => { if (o.move && !adPlaying) o.move(...pos(e)); });
    const up = (e) => { if (o.up && !adPlaying) o.up(...pos(e)); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    window.addEventListener('pagehide', k.persist);

    resize();
    // 게임 쪽에서 k 를 받은 뒤에 첫 배치를 계산한다
    Promise.resolve().then(() => { ready = true; if (o.layout) o.layout(); });
    let last = performance.now();
    k.time = 0;
    const frame = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      if (!adPlaying) { k.time += dt; if (o.update) o.update(dt); }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, k.H);
      g.addColorStop(0, '#0a0a22'); g.addColorStop(1, '#1a1040');
      ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H);
      o.draw(ctx);
      requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', () => { last = performance.now(); if (document.hidden) k.persist(); });
    requestAnimationFrame(frame);
    return k;
  }
  return { create, KO, L };
})();
