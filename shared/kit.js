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
    adph: ['광고 영역 (테스트)', 'Ad placeholder (test)'], privacy: ['개인정보처리방침', 'Privacy Policy']
  };
  const T = (k) => L(STR[k] || k);
  window.T = T;
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
    const k = { W: 420, H: 746, ctx, save, state: 'menu', revived: false, adThisRun: false, KO, L, T };
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

    const begin = () => {
      k.revived = false; k.adThisRun = false;
      k.closePanel(); k.state = 'play'; o.start();
    };
    k.begin = begin;
    k.menu = () => {
      k.state = 'menu';
      k.panel({
        title: L(o.title), tag: L(o.tagline),
        sub: o.menuSub ? o.menuSub() : T('best') + ' ' + save.best,
        buttons: [{ label: T('start'), kind: 'primary', fn: begin }, { label: '🎮 ' + T('home'), href: '../index.html' }],
        hint: L(o.hint), privacy: true
      });
    };
    const share = async (score) => {
      const text = L(o.title) + ' — ' + score + (KO ? '점! 이길 수 있어?' : ' points! Can you beat it?');
      try {
        if (navigator.share) await navigator.share({ text, url: location.href });
        else { await navigator.clipboard.writeText(text + ' ' + location.href); k.toast(T('copied')); }
      } catch (e) {}
    };
    // 게임오버: revive 함수를 주면 한 판에 한 번 "광고 보고 이어하기" 제공
    k.over = (score, revive) => {
      k.state = 'over';
      const nb = score > save.best;
      if (nb) save.best = score;
      common.plays += 1; k.persist();
      k.panel({
        kicker: nb && score > 0 ? T('newbest') : '', label: T('score'), big: score, sub: T('best') + ' ' + save.best,
        buttons: [
          revive && !k.revived && { label: T('revive'), kind: 'ad', fn: () => k.rewarded('revive', () => { k.revived = true; k.closePanel(); k.state = 'play'; revive(); }) },
          { label: T('retry'), kind: 'primary', fn: async () => { await k.interstitial(); begin(); } },
          [{ label: T('share'), fn: () => share(score) }, { label: T('home'), href: '../index.html' }]
        ]
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
