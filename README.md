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

1. 이 브랜치를 `main` 에 병합
2. 저장소 **Settings → Pages → Source: Deploy from a branch → main / (root)**
3. `https://<사용자명>.github.io/game/` 에서 플레이

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
- 앱 스토어 출시: Capacitor 로 감싼 뒤 AdMob 플러그인으로 교체

> 참고: 광고 제거 같은 유료 결제는 서버 검증이 필요해 포함하지 않았습니다. 지금은 후원 링크만 지원합니다.

## 파일 구조

| 파일 | 역할 |
|---|---|
| `index.html`, `style.css` | 화면/UI |
| `game.js` | 게임 로직, 상점, 출석 보상 |
| `ads.js` | 광고 어댑터 (mock / adsense / none) |
| `config.js` | 수익화 설정 |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | PWA (오프라인·홈 화면 설치) |
