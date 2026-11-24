# 내가 직접 해야 하는 일

코드·빌드·문서는 모두 끝나 있습니다. 아래는 **계정·본인 인증·결제·비밀 키**처럼 본인만 할 수 있는 일입니다.
위에서부터 순서대로 하면 됩니다.

## A. 오늘 바로 (무료, 10분)

- [ ] **1. 웹 게임 공개하기**
  저장소 [Settings → Pages](https://github.com/davidscahn-source/game/settings/pages) →
  Source: **Deploy from a branch** → Branch: **`ccr-4673a09d-6kywne`**, 폴더 **`/ (root)`** → **Save**
  → 2~3분 뒤 https://davidscahn-source.github.io/game/ 접속 확인 (게임 4종 목록이 나옵니다)
- [ ] **2. 개인정보처리방침 빈칸 2개 채우기**
  `privacy.html` 에서 `[개발자 이름]`, `[연락처 이메일]` (영문 부분 `[Developer name]`, `[contact email]` 포함)
  → 공개되는 주소이니 공개용 이메일을 쓰세요. Claude 에게 "이름은 ○○, 이메일은 ○○ 로 넣어줘" 라고 해도 됩니다.
- [ ] **3. 휴대폰에 앱 설치해 보기**
  [Actions → Android build](https://github.com/davidscahn-source/game/actions/workflows/android.yml) → 맨 위 실행 → 아래 **Artifacts** 의
  `cosmo-arcade-debug-apk` 다운로드 → 압축 풀기 → `app-debug.apk` 를 안드로이드 폰에 설치
  → 아무 게임에서 "광고 보고 이어하기" 를 눌러 **Test Ad** 라고 적힌 광고가 뜨는지 확인

## B. 계정 만들기 (돈·본인 인증 필요)

- [ ] **4. Google Play 개발자 계정** — https://play.google.com/console
  등록비 25달러(1회) 결제 + 신분증 본인 인증. 승인까지 며칠 걸릴 수 있음
- [ ] **5. AdMob 계정** — https://admob.google.com
  1) 앱 추가(Android, "아직 스토어에 없음") → **앱 ID** (`ca-app-pub-…~…`)
  2) 광고 단위 2개 만들기: **보상형** 1개, **전면** 1개 → **광고 단위 ID** 2개 (`ca-app-pub-…/…`)
  3) 이 ID 3개를 Claude 에게 알려주면 코드에 넣어 드립니다 (직접 넣으려면 README "출시 전 체크리스트" 1번)
  4) 결제 정보(주소·세금 정보·계좌) 입력 — 수익을 받으려면 필수
  ⚠️ 실제 광고를 본인이 누르지 마세요. 계정이 정지될 수 있습니다.

## C. 서명 키 등록 (5분)

- [ ] **6. 서명 키 백업** — Claude 가 채팅으로 보낸 `release.jks`, `secrets-to-register.txt` 두 파일을
  본인만 볼 수 있는 곳(개인 클라우드, USB 등)에 저장. **저장소에 올리거나 남에게 보내지 마세요.**
- [ ] **7. GitHub 에 비밀값 4개 등록**
  [Settings → Secrets and variables → Actions](https://github.com/davidscahn-source/game/settings/secrets/actions) → **New repository secret**
  → `secrets-to-register.txt` 에 적힌 이름/값 4개를 그대로 등록
  → [Actions → Android build](https://github.com/davidscahn-source/game/actions/workflows/android.yml) → **Run workflow**
  → 끝나면 Artifacts 에 `cosmo-arcade-release-aab` 가 생김 (스토어 제출용 파일)

## D. 스토어 등록 (Play Console 승인 후)

- [ ] **8. 앱 만들기 + 등록정보 입력** — Play Console → 앱 만들기 (이름: 코스모 아케이드, 게임, 무료)
  - 앱 아이콘: `store/icon-512.png` / 그래픽 이미지: `store/feature-1024x500.png`
  - 스크린샷: 휴대폰에서 게임 화면 2장 이상 캡처 (게임 4종을 한 장씩 찍으면 좋습니다)
  - 개인정보처리방침 URL: `https://davidscahn-source.github.io/game/privacy.html`
  - 광고 포함: **예** / 콘텐츠 등급 설문: 폭력·도박 등 모두 "아니요"
  - 데이터 보안: "기기 또는 기타 ID" 수집·공유 **예**, 목적 **광고**
- [ ] **9. 비공개 테스트** — 7번에서 받은 `.aab` 업로드 → 테스터 **12명 이상**의 구글 이메일 등록 →
  테스터들이 설치 링크로 참여한 상태로 **14일 유지** (새 개인 계정 필수 조건)
- [ ] **10. 프로덕션 출시 신청** — 14일 뒤 Play Console 에서 프로덕션 액세스 신청 → 심사 통과 후 출시

## 나중에 (선택)

- 웹에서도 광고 수익을 내려면: 본인 도메인 구입 → AdSense 승인 (`github.io` 주소로는 승인이 어렵습니다)
- 수익이 실제로 생기면: 사업자등록·세금 신고를 세무서나 세무사에게 확인
