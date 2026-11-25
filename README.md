# 코스모 아케이드 · Cosmo Arcade

짧게 즐기는 미니게임 5종 모음입니다. 의존성·빌드 없이 정적 파일만으로 동작하고
(모바일/PC, PWA 설치, 한국어/영어 자동 전환), 같은 코드를 안드로이드 앱으로도 포장합니다.

| 게임 | 폴더 | 장르 | 벤치마킹한 시장 흐름 |
|---|---|---|---|
| ⚡ 링 러시 (Ring Rush) | `rush/` | 고난도 반사신경 | 짧은 판 + 즉시 재도전, 기록 경쟁용 |
| 🧩 별 블록 (Star Blocks) | `blocks/` | 8×8 블록 퍼즐 | 광고 수익 1위 장르. 퍼즐이 모바일 게임 광고 수익의 절반 이상 |
| 🪐 행성 머지 (Planet Merge) | `merge/` | 물리 머지 | 가장 빠르게 성장하는 하위 장르, 이용자당 광고 수익이 높음 |
| 🧪 별빛 정렬 (Star Sort) | `sort/` | 색 정렬 레벨 퍼즐 | 2026년 급상승 중인 정렬(sort) 퍼즐 |
| 🚀 궤도 점프 (Orbit Leap) | `orbit/` | 원터치 아케이드 | 하이퍼캐주얼 |

장르와 수익 구조만 참고했고, 게임 이름·그래픽·규칙 세부는 모두 자체 제작입니다.
루트 `index.html` 이 게임 목록(허브)이고, 각 게임 메뉴에 "다른 게임" 버튼이 있어 서로 이용자를 넘겨줍니다.

## 게임별 규칙과 광고 지점

- **링 러시** — 공이 두 겹의 궤도를 돕니다. 탭하면 안쪽↔바깥쪽 궤도를 바꿔 장애물을 피합니다. 계속 빨라지고,
  장애물 직전에 피하면 "아슬아슬" 보너스. *보상형 광고: 앞의 장애물을 치우고 이어하기*
- **별 블록** — 아래 조각 3개를 판에 끌어다 놓고, 가로·세로 줄을 채우면 지워집니다. 여러 줄 동시·연속 지우기에 보너스.
  놓을 곳이 없으면 끝. *보상형 광고: 가장 찬 줄 3개를 지우고 이어하기*
- **행성 머지** — 좌우로 위치를 잡고 손을 떼면 행성이 떨어집니다. 같은 숫자끼리 닿으면 한 단계 큰 행성으로 합쳐집니다.
  점선 위로 2초 넘게 쌓이면 끝. *보상형 광고: 작은 행성을 모두 치우고 이어하기*
- **별빛 정렬** — 병을 눌러 맨 위 구슬을 들고 다른 병에 옮겨, 색마다 한 병에 모으면 클리어. 레벨이 오를수록 색이 늘어납니다
  (배치의 풀이 가능성을 검사하며, 탐색 제한 안에서 찾지 못하면 대체 배치를 사용). *보상형 광고: 되돌리기 +5, 빈 병 추가*
- **궤도 점프** — 탭하면 접선 방향으로 발사, 다음 행성 궤도에 착지. 빠르게 연속으로 뛰면 콤보.
  *보상형 광고: 이어하기, 코인 2배* · 스킨 상점, 출석 보상

모든 게임 공통: `interstitialEvery` 판(레벨)마다 전면 광고 1회. 보상형 광고를 본 판은 전면 광고를 생략합니다.

## 승부욕·재방문 장치

서버 없이 동작하도록 설계했습니다 (점수는 기기에 저장, 대결은 링크로).

| 장치 | 내용 |
|---|---|
| 기록 추격 | 플레이 중 최고 기록의 85% 에 닿으면 "최고 기록까지 N점", 넘으면 "신기록 갱신 중" 알림 |
| 아깝다 알림 | 최고 기록에 근소하게 못 미치면 게임오버 화면에 "단 N점!" — 바로 아래에 이어하기(보상형 광고) 버튼 |
| 친구 도전장 | 공유 링크에 내 점수가 실려, 받은 사람 화면에 "친구 기록 N점에 도전" 목표가 뜨고 승패가 표시됨 |
| 오늘의 도전 | 링 러시·별 블록·행성 머지는 날짜로 난수를 고정해 그날은 모두 같은 판. 공정성을 위해 이어하기 없음 |
| 등급 | 최고 점수에 따라 브론즈~마스터 6단계, 다음 등급까지 남은 점수 표시 |
| 난이도 상승 | 링 러시: 속도·연속 장애물 / 별 블록: 큰 조각 비중 / 행성 머지: 큰 행성 출현 / 별빛 정렬: 색 수 증가 + 미스터리 레벨(5, 8, 11…) |
| 연속 접속 | 허브에 연속 접속 일수 표시 (끊겨도 불이익 없음) |

## 광고 설계 원칙 (업계 권장 사항 반영)

- **보상형 우선**: 이용자가 직접 고르는 광고(이어하기, 되돌리기 등)를 핵심으로 두고, 필요한 순간에만 제안
- **전면 광고는 게임오버 흐름이 끝난 뒤에만**, 보상형 제안과 겹치지 않게
- **새 이용자 유예**: 처음 `interstitialGrace` 번(기본 2)은 전면 광고를 건너뜀 — 첫인상과 재방문율 보호
- **최소 간격**: 광고 사이 `interstitialMinSeconds` 초(기본 45) 미만이면 전면 광고 생략
- 수치는 `config.js` 에서 조정. 실제 최적값은 출시 후 재방문율과 수익을 함께 보며 맞춰야 합니다.

## 로컬 실행

```bash
python3 -m http.server 8000   # 그 다음 http://localhost:8000
npm test                      # 광고 동의·공유·퍼즐 회귀 테스트
```

## 배포 (GitHub Pages)

1. 저장소 **Settings → Pages → Source: Deploy from a branch → `ccr-4673a09d-6kywne` / (root)** → Save
2. 몇 분 뒤 `https://davidscahn-source.github.io/game/` 에서 플레이

> 직접 해야 하는 일만 모은 목록은 [TODO.md](TODO.md) 에 있습니다.

## 수익화

모든 설정은 `config.js` 한 파일에 있습니다.

광고 지점은 위 "게임별 규칙과 광고 지점" 참고. `supportUrl` 을 채우면 궤도 점프 메뉴에 후원 버튼이 표시됩니다.

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

게임 5종을 한 앱(코스모 아케이드)으로 묶어 [Capacitor](https://capacitorjs.com) 로 감싼 안드로이드 프로젝트가 `android/` 에 있습니다.
앱 하나만 등록하면 되므로 스토어 심사·테스트·AdMob 설정을 한 번만 하면 됩니다. 반응이 좋은 게임은 나중에 단독 앱으로 분리할 수 있습니다.
앱 안에서는 광고가 자동으로 **AdMob** 으로 바뀝니다 (`ads.js`). 동의 상태가 확인되기 전에는 광고를 요청하지 않으며, 필요한 지역에서는 허브에 광고 개인정보 설정 버튼을 표시합니다. 앱의 공유 기능은 공개 웹 게임 주소로 연결합니다.

### 앱 파일 받기 — 컴퓨터에 아무것도 설치하지 않는 방법

푸시할 때마다 GitHub Actions 가 앱을 빌드합니다.

1. 저장소 **Actions → Android build → 최근 실행** 클릭
2. 아래 **Artifacts** 에서 `cosmo-arcade-debug-apk` 다운로드 → 압축을 풀어 `app-debug.apk` 를 휴대폰에 설치 (테스트용)

### 내 컴퓨터에서 빌드 (선택)

Node 22+, JDK 21, Android Studio 필요.

```bash
npm install
npm run apk     # android/app/build/outputs/apk/debug/app-debug.apk
npm run open    # Android Studio 로 열기
```

웹 파일을 고친 뒤에는 `npm run sync` 로 앱에 반영합니다.

### 출시 전 체크리스트

1. **AdMob ID 교체** — [AdMob](https://admob.google.com) 에서 앱과 광고 단위(보상형 1개, 전면 1개)를 만든 뒤
   - `android/app/src/main/res/values/strings.xml` 의 `admob_app_id` → 본인 앱 ID (`ca-app-pub-…~…`)
   - `config.js` 의 `admob.rewardedId`, `admob.interstitialId` → 본인 광고 단위 ID, `testMode: false`
   - 지금 들어 있는 값은 구글 공식 **테스트 ID** 라서 수익이 발생하지 않습니다. 반대로 개발 중에 실제 ID 로 본인 광고를 누르면 계정이 정지될 수 있으니 테스트는 꼭 테스트 ID 로 하세요.
2. **개인정보처리방침** — `privacy.html` 의 `[개발자 이름]`, `[연락처 이메일]` 을 채우고,
   GitHub Pages 주소(`https://<사용자명>.github.io/game/privacy.html`)를 Play Console 에 입력
3. **패키지 이름** — 현재 `io.github.davidscahnsource.cosmoarcade`. 스토어에 한 번 올리면 바꿀 수 없으니,
   바꾸려면 업로드 전에 `capacitor.config.json`, `android/app/build.gradle` 의 `applicationId`, `strings.xml` 을 함께 수정
4. **업로드 서명 키** — 이미 만든 이 앱의 업로드 키를 계속 사용하고, 키와 암호를 안전하게 백업합니다. 저장소 **Settings → Secrets and variables → Actions**에 `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`가 있으면 빌드에서 서명된 `cosmo-arcade-release-aab`를 생성합니다. 키나 암호는 저장소에 커밋하지 마세요.
5. **업데이트할 때** — `android/app/build.gradle` 의 `versionCode` 를 1씩 올려야 업로드됩니다.
6. **스토어 등록 이미지** — `store/icon-512.png`(앱 아이콘), `store/feature-1024x500.png`(그래픽 이미지). 스크린샷은 휴대폰에서 직접 캡처(최소 2장).
7. Play Console의 **데이터 보안** 설문은 [Google Mobile Ads SDK 데이터 안내](https://developers.google.com/admob/android/privacy/play-data-disclosure)와 실제 앱 설정을 바탕으로 작성하고, 광고 포함 여부를 표시합니다.

## 파일 구조

| 경로 | 역할 |
|---|---|
| `index.html` | 게임 목록(허브) |
| `rush/`, `blocks/`, `merge/`, `sort/`, `orbit/` | 게임별 화면과 로직 |
| `shared/kit.js`, `shared/kit.css` | 공용 틀 (메뉴·게임오버·저장·소리·광고 흐름·오늘의 도전·친구 도전·등급) |
| `ads.js` | 광고 어댑터 (웹: mock / adsense / none, 앱: AdMob 자동) |
| `config.js` | 수익화 설정 — 모든 게임 공통 |
| `privacy.html` | 개인정보처리방침 (한국어/영어) |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | PWA (오프라인·홈 화면 설치) |
| `android/`, `capacitor.config.json`, `package.json`, `scripts/` | 안드로이드 앱 프로젝트 |
| `assets/`, `store/` | 앱 아이콘 원본, 스토어 등록용 이미지 |
| `.github/workflows/android.yml` | APK/AAB 자동 빌드 |
| `TODO.md` | 저장소 주인이 직접 해야 하는 일 |

새 게임을 추가하려면 폴더를 하나 만들어 `Kit.create({...})` 로 시작하고, `index.html`(허브)·`sw.js`·`scripts/build-web.js` 에 한 줄씩 추가하면 됩니다.
