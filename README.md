# 궤도 점프 · Orbit Leap

탭 한 번으로 행성 사이를 뛰어넘는 원터치 아케이드 웹 게임입니다.
의존성·빌드 없이 정적 파일만으로 동작합니다 (모바일/PC, PWA 설치 지원, 한국어/영어 자동 전환).

## 플레이 방법

- 공이 행성 주위를 돕니다. **탭(또는 스페이스)** 하면 접선 방향으로 발사됩니다.
- 다음 행성의 점선 궤도 안에 들어가면 착지 → 점수.
- 착지 후 0.9초 안에 다시 뛰면 **콤보** (추가 점수 + 코인).
- 아래에서 붉은 공허가 올라옵니다. 머뭇거리면 끝!
- 좌우 벽은 튕깁니다. 여러 행성을 건너뛰면 그만큼 점수를 더 받습니다.

## 로컬 실행

```bash
python3 -m http.server 8000   # 그 다음 http://localhost:8000
```

## 배포 (GitHub Pages)

1. 저장소 **Settings → Pages → Source: Deploy from a branch → `ccr-4673a09d-6kywne` / (root)** → Save
2. 몇 분 뒤 `https://davidscahn-source.github.io/game/` 에서 플레이

> 직접 해야 하는 일만 모은 목록은 [TODO.md](TODO.md) 에 있습니다.

## 수익화

모든 설정은 `config.js` 한 파일에 있습니다.

| 수익 지점 | 위치 | 설명 |
|---|---|---|
| 보상형 광고 | 게임오버 → "광고 보고 이어하기" | 한 판에 1회 부활 |
| 보상형 광고 | 게임오버 → "광고 보고 코인 2배" | 그 판에서 번 코인 2배 |
| 전면 광고 | "다시 하기" | `interstitialEvery` 판마다 1회 (보상형을 본 판은 생략) |
| 후원 링크 | 메뉴 | `supportUrl` 을 채우면 버튼 표시 |

재방문 장치: 최고 기록, 출석 보상(연속 출석 시 증가), 코인으로 사는 스킨 8종, 점수 공유.

### 실제 광고 켜기 (Google AdSense H5 게임 광고)

기본값은 `provider: 'mock'` — **가짜 광고 화면만 나오고 수익은 없습니다.** 실제 수익을 내려면:

1. [AdSense](https://adsense.google.com) 가입 후 게임을 올린 도메인 승인 받기
   (H5 게임 광고는 별도 신청이 필요할 수 있습니다)
2. `config.js` 수정
   ```js
   ads: { provider: 'adsense', adsenseClient: 'ca-pub-본인ID', testMode: true, ... }
   ```
3. 테스트 광고가 잘 나오면 `testMode: false`
4. 사이트 루트에 AdSense 가 안내하는 `ads.txt` 추가

광고 연동 코드는 `ads.js` 에 분리되어 있어, 다른 플랫폼으로 바꿀 때는
`Ads.rewarded()` / `Ads.interstitial()` 두 함수만 교체하면 됩니다.

- 게임 포털(CrazyGames, Poki 등) 입점: 각 포털 SDK 로 교체 — 트래픽을 직접 모으지 않아도 됨
- 앱 스토어 출시: 아래 "안드로이드 앱" 참고 (AdMob 연동 완료)

> 참고: 광고 제거 같은 유료 결제는 서버 검증이 필요해 포함하지 않았습니다. 지금은 후원 링크만 지원합니다.

## 안드로이드 앱 (구글 플레이)

웹 게임을 [Capacitor](https://capacitorjs.com) 로 감싼 안드로이드 프로젝트가 `android/` 에 있습니다.
앱 안에서는 광고가 자동으로 **AdMob** 으로 바뀝니다 (`ads.js`).

### 앱 파일 받기 — 컴퓨터에 아무것도 설치하지 않는 방법

푸시할 때마다 GitHub Actions 가 앱을 빌드합니다.

1. 저장소 **Actions → Android build → 최근 실행** 클릭
2. 아래 **Artifacts** 에서 `orbit-leap-debug-apk` 다운로드 → 압축을 풀어 `app-debug.apk` 를 휴대폰에 설치 (테스트용)

### 내 컴퓨터에서 빌드 (선택)

Node 22+, JDK 21, Android Studio 필요.

```bash
npm install
npm run apk     # android/app/build/outputs/apk/debug/app-debug.apk
npm run open    # Android Studio 로 열기
```

웹 파일(`index.html`, `game.js` 등)을 고친 뒤에는 `npm run sync` 로 앱에 반영합니다.

### 출시 전 체크리스트

1. **AdMob ID 교체** — [AdMob](https://admob.google.com) 에서 앱과 광고 단위(보상형 1개, 전면 1개)를 만든 뒤
   - `android/app/src/main/res/values/strings.xml` 의 `admob_app_id` → 본인 앱 ID (`ca-app-pub-…~…`)
   - `config.js` 의 `admob.rewardedId`, `admob.interstitialId` → 본인 광고 단위 ID, `testMode: false`
   - 지금 들어 있는 값은 구글 공식 **테스트 ID** 라서 수익이 발생하지 않습니다. 반대로 개발 중에 실제 ID 로 본인 광고를 누르면 계정이 정지될 수 있으니 테스트는 꼭 테스트 ID 로 하세요.
2. **개인정보처리방침** — `privacy.html` 의 `[개발자 이름]`, `[연락처 이메일]` 을 채우고,
   GitHub Pages 주소(`https://<사용자명>.github.io/game/privacy.html`)를 Play Console 에 입력
3. **패키지 이름** — 현재 `io.github.davidscahnsource.orbitleap`. 스토어에 한 번 올리면 바꿀 수 없으니,
   바꾸려면 업로드 전에 `capacitor.config.json` 과 `android/app/build.gradle`, `strings.xml`, `MainActivity.java` 경로를 함께 수정
4. **서명 키 만들기** (한 번만, 분실하면 안 됨 — 안전한 곳에 백업)
   ```bash
   keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias orbitleap
   base64 -w0 release.jks   # 출력된 긴 문자열을 복사
   ```
   저장소 **Settings → Secrets and variables → Actions** 에 4개 등록:
   `KEYSTORE_BASE64`(위 문자열), `KEYSTORE_PASSWORD`, `KEY_ALIAS`(`orbitleap`), `KEY_PASSWORD`
   → 다음 빌드부터 Artifacts 에 `orbit-leap-release-aab` 가 생깁니다. 이 `.aab` 파일을 Play Console 에 업로드합니다.
   **키스토어 파일과 비밀번호는 절대 저장소에 커밋하지 마세요.**
5. **업데이트할 때** — `android/app/build.gradle` 의 `versionCode` 를 1씩 올려야 업로드됩니다.
6. **스토어 등록 이미지** — `store/icon-512.png`(앱 아이콘), `store/feature-1024x500.png`(그래픽 이미지). 스크린샷은 휴대폰에서 직접 캡처(최소 2장).
7. Play Console 의 **데이터 보안** 설문에서는 "광고 ID / 기기 ID 수집 — 광고 목적, 제3자(Google) 공유" 로 답하고, **광고 포함: 예** 로 표시

## 파일 구조

| 파일 | 역할 |
|---|---|
| `index.html`, `style.css` | 화면/UI |
| `game.js` | 게임 로직, 상점, 출석 보상 |
| `ads.js` | 광고 어댑터 (mock / adsense / none) |
| `config.js` | 수익화 설정 |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | PWA (오프라인·홈 화면 설치) |
| `privacy.html` | 개인정보처리방침 (한국어/영어) |
| `android/`, `capacitor.config.json`, `package.json` | 안드로이드 앱 프로젝트 |
| `assets/`, `store/` | 앱 아이콘 원본, 스토어 등록용 이미지 |
| `.github/workflows/android.yml` | APK/AAB 자동 빌드 |
