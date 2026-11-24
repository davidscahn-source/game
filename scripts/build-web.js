// 웹 게임 파일을 www/ 로 복사한다 (Capacitor 가 앱에 넣는 폴더).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const items = ['index.html', 'privacy.html', 'config.js', 'ads.js', 'icon.svg', 'manifest.webmanifest', 'sw.js',
  'shared', 'orbit', 'blocks', 'merge', 'sort', 'rush'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of items) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
console.log('www/ <- ' + items.join(', '));
