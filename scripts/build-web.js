// 저장소 루트의 웹 게임 파일을 www/ 로 복사한다 (Capacitor 가 앱에 넣는 폴더).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const files = ['index.html', 'style.css', 'config.js', 'ads.js', 'game.js', 'icon.svg', 'manifest.webmanifest', 'privacy.html', 'sw.js'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
console.log('www/ <- ' + files.join(', '));
