# 구글 플레이 비공개 테스트 준비

이 버전은 **무료 앱 + 테스트 광고**를 기준으로 합니다. 테스트 광고는 수익을 내지 않으며, 개발자와 테스터가 실제 광고를 누르지 않도록 그대로 둡니다.

## 제출 전에 확인할 것

- [ ] **개발자 정보 채우기:** `privacy.html`의 `[개발자 이름]`, `[연락처 이메일]` 및 영문 빈칸을 공개 가능한 정보로 교체합니다. 사용자의 요청에 따라 현재는 빈칸으로 남겨 두었습니다. Play Console의 스토어 등록 연락처도 입력해야 합니다.
- [ ] **변경 사항 게시:** 테스트용 AAB에 수정된 게임이 포함되어 있어도, 개인정보처리방침 URL과 친구가 여는 웹 게임은 별도로 공개되어야 합니다. 이 변경을 기본 브랜치에 반영하고 GitHub Pages에 배포한 뒤 URL을 확인합니다.
- [ ] **업로드 키 백업:** 이 앱에 사용한 업로드 키와 암호를 각각 안전하게 백업합니다. 새 키로 바꾸면 이후 업데이트 업로드가 막힐 수 있습니다. 키나 암호를 저장소나 채팅에 올리지 않습니다.
- [ ] **Play Console 계정:** 개발자 계정 등록과 본인 확인을 마친 뒤 새 앱을 만듭니다. 앱 이름은 `Cosmo Arcade`, 패키지 ID는 `io.github.davidscahnsource.cosmoarcade`, 앱 유형은 게임, 가격은 무료입니다.
- [ ] **앱 콘텐츠와 데이터 보안:** 광고 포함 여부, 대상 연령, 콘텐츠 등급, 개인정보처리방침을 실제 앱에 맞게 작성합니다. 데이터 보안은 기기 ID 한 항목만 가정하지 말고 [Google Mobile Ads SDK 데이터 안내](https://developers.google.com/admob/android/privacy/play-data-disclosure)와 앱의 실제 설정을 함께 검토합니다.
- [ ] **스토어 등록정보:** `store/icon-512.png`, `store/feature-1024x500.png`와 실제 앱의 휴대폰 스크린샷을 등록합니다. 스크린샷과 설명은 실제 게임을 보여 주어야 합니다.

## 테스트 파일 만들고 올리기

1. GitHub 저장소의 **Actions → Android build**를 실행합니다. 서명 비밀값 `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`가 등록되어 있으면 `cosmo-arcade-release-aab` 아티팩트가 생성됩니다.
2. 아티팩트에서 `.aab`를 내려받아 Play Console의 **테스트 및 출시 → 테스트 → 비공개 테스트** 트랙에 업로드합니다. `app-debug.apk`는 휴대폰에 직접 설치해 확인하는 파일이며 Play Console 제출용이 아닙니다.
3. 테스터 명단을 추가하고 테스트 참여 링크를 전달합니다. 광고는 **Test Ad**로 표시되어야 합니다. 게임 시작, 종료, 이어하기, 공유, 오프라인 및 화면 크기를 서로 다른 기기에서 확인합니다.
4. 2023년 11월 13일 이후에 만든 개인 개발자 계정은 프로덕션 액세스 신청 전 12명 이상이 14일 연속 비공개 테스트에 참여해야 합니다. 계정 유형과 정확한 상태는 [Google Play 테스트 안내](https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko)를 확인합니다.
5. 새 빌드를 올릴 때마다 `android/app/build.gradle`의 `versionCode`를 이전에 올린 값보다 높입니다.

## 정식 광고 수익을 켤 때

별도 AdMob 앱 ID와 광고 단위 ID를 발급받아 `android/app/src/main/res/values/strings.xml` 및 `config.js`에 넣고 공개용 설정을 검증합니다. 테스트는 계속 테스트 ID 또는 등록된 테스트 기기에서 진행합니다. 동의 메시지가 필요한 국가에 배포할 경우 AdMob에서 메시지를 설정하고 동의 및 개인정보 설정 변경을 확인합니다.
