// Android 앱에서는 생년월일을 저장하지 않고 연령대만 기기에 보관한다.
(() => {
  'use strict';

  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const key = 'cosmo.ageGroup.v1';
  const validFor = 365 * 24 * 60 * 60 * 1000;
  let pending = null;

  function savedGroup() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      const elapsed = Date.now() - saved.checkedAt;
      if ((saved.group === 'adult' || saved.group === 'minor') &&
          Number.isFinite(saved.checkedAt) && elapsed >= 0 && elapsed < validFor) return saved.group;
    } catch (e) {}
    return null;
  }

  let group = native ? savedGroup() : null;

  function language() {
    let preference = null;
    try { preference = new URLSearchParams(location.search).get('lang') || localStorage.getItem('cosmo.lang'); } catch (e) {}
    return preference ? preference === 'ko' : (navigator.language || 'en').toLowerCase().startsWith('ko');
  }

  function classify(yearText, monthText, dayText) {
    if (!/^\d{4}$/.test(yearText) || !/^\d{1,2}$/.test(monthText) || !/^\d{1,2}$/.test(dayText)) return null;
    const year = Number(yearText), month = Number(monthText), day = Number(dayText);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    if (year < 1 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    const today = new Date();
    const birth = year * 10000 + month * 100 + day;
    const now = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    if (birth > now) return null;
    const age = today.getFullYear() - year - ((month > today.getMonth() + 1 ||
      (month === today.getMonth() + 1 && day > today.getDate())) ? 1 : 0);
    return age >= 18 ? 'adult' : 'minor';
  }

  function showScreen(resolve) {
    const ko = language();
    const text = ko ? {
      title: '생년월일을 입력해 주세요',
      explanation: '연령에 맞는 서비스를 위해 확인합니다. 생년월일은 저장하거나 전송하지 않으며, 확인 결과만 이 기기에 저장합니다.',
      year: '연도', month: '월', day: '일', action: '계속',
      error: '올바른 생년월일을 입력해 주세요.'
    } : {
      title: 'Enter your date of birth',
      explanation: 'We use this to provide an age-appropriate experience. Your date of birth is not saved or sent; only the result is stored on this device.',
      year: 'Year', month: 'Month', day: 'Day', action: 'Continue',
      error: 'Please enter a valid date of birth.'
    };

    const dialog = document.createElement('dialog');
    dialog.className = 'cosmo-age-screen';
    dialog.setAttribute('aria-labelledby', 'cosmo-age-title');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = `
      <style>
        .cosmo-age-screen{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:24px;border:0;color:#fff;background:#0b0b1e;font-family:system-ui,-apple-system,sans-serif;z-index:2147483647}
        .cosmo-age-screen::backdrop{background:#0b0b1e}
        .cosmo-age-screen .age-card{width:min(100%,420px);margin:clamp(35px,12vh,110px) auto 0}
        .cosmo-age-screen h1{font-size:26px;line-height:1.3;margin:0 0 14px}
        .cosmo-age-screen p{color:#d6d4e9;line-height:1.55;font-size:15px;margin:0 0 24px;word-break:keep-all;overflow-wrap:break-word}
        .cosmo-age-screen .age-fields{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:10px}
        .cosmo-age-screen label{font-size:14px;color:#e5e4f5;display:block}
        .cosmo-age-screen input{box-sizing:border-box;display:block;width:100%;margin-top:8px;padding:13px 10px;font:inherit;font-size:18px;color:#fff;background:#211c3b;border:1px solid #746d99;border-radius:10px}
        .cosmo-age-screen input:focus-visible,.cosmo-age-screen button:focus-visible{outline:3px solid #7df9ff;outline-offset:3px}
        .cosmo-age-screen .age-error{color:#ffc4c4;margin:12px 0 0}
        .cosmo-age-screen button{width:100%;padding:14px;margin-top:24px;border:0;border-radius:12px;background:#7df9ff;color:#111127;font:inherit;font-weight:700;font-size:17px;cursor:pointer}
        .cosmo-age-screen [hidden]{display:none}
      </style>
      <div class="age-card">
        <h1 id="cosmo-age-title">${text.title}</h1>
        <p>${text.explanation}</p>
        <form novalidate autocomplete="off">
          <div class="age-fields">
            <label>${text.year}<input id="cosmo-age-year" type="text" inputmode="numeric" maxlength="4" placeholder="YYYY" autocomplete="off" required></label>
            <label>${text.month}<input id="cosmo-age-month" type="text" inputmode="numeric" maxlength="2" placeholder="MM" autocomplete="off" required></label>
            <label>${text.day}<input id="cosmo-age-day" type="text" inputmode="numeric" maxlength="2" placeholder="DD" autocomplete="off" required></label>
          </div>
          <p class="age-error" role="alert" hidden>${text.error}</p>
          <button type="submit">${text.action}</button>
        </form>
      </div>`;
    const form = dialog.querySelector('form');
    const year = dialog.querySelector('#cosmo-age-year');
    const month = dialog.querySelector('#cosmo-age-month');
    const day = dialog.querySelector('#cosmo-age-day');
    const error = dialog.querySelector('.age-error');
    dialog.addEventListener('cancel', (event) => event.preventDefault());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = classify(year.value.trim(), month.value.trim(), day.value.trim());
      if (!result) { error.hidden = false; return; }
      group = result;
      try { localStorage.setItem(key, JSON.stringify({ group, checkedAt: Date.now() })); } catch (e) {}
      form.reset();
      if (typeof dialog.close === 'function') dialog.close();
      dialog.remove();
      resolve(group);
    });
    document.body.appendChild(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    year.focus();
  }

  function ensure() {
    if (!native) return Promise.resolve(null);
    if (group) return Promise.resolve(group);
    if (!pending) pending = new Promise((resolve) => showScreen(resolve));
    return pending;
  }

  window.AgeGate = { ensure, get group() { return group; } };
  if (native) ensure();
})();
