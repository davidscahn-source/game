// 수익화 설정 — 이 파일만 고치면 됩니다.
window.GAME_CONFIG = {
  ads: {
    // 'mock'    : 테스트용 가짜 광고 (기본값, 수익 없음)
    // 'adsense' : Google AdSense H5 게임 광고 (실제 수익)
    // 'none'    : 광고 끔 (보상은 그냥 지급)
    provider: 'mock',
    adsenseClient: 'ca-pub-0000000000000000', // 본인 AdSense 게시자 ID
    testMode: true,          // 실서비스 전에 false 로 변경
    interstitialEvery: 3,    // N판마다 전면 광고 1회
    interstitialGrace: 2,    // 새 이용자는 처음 N번의 전면 광고를 건너뜀 (첫인상·재방문율 보호)
    interstitialMinSeconds: 45, // 광고와 광고 사이 최소 간격(초)

    // 안드로이드 앱(Capacitor)에서는 위 provider 와 무관하게 AdMob 이 자동으로 쓰입니다.
    // 아래는 구글 공식 테스트 광고 ID — 출시 전에 본인 AdMob 광고 단위 ID 로 교체하세요.
    // (앱 ID 는 android/app/src/main/res/values/strings.xml 의 admob_app_id)
    admob: {
      rewardedId: 'ca-app-pub-3940256099942544/5224354917',
      interstitialId: 'ca-app-pub-3940256099942544/1033173712',
      testMode: true         // 출시 빌드 전에 false 로 변경
    }
  },
  // 앱에서 공유한 링크는 기기의 localhost가 아니라 공개 웹 게임으로 연결한다.
  publicGameUrl: 'https://davidscahn-source.github.io/game/',
  // 후원 링크 (Ko-fi, 토스 아이디, Buy Me a Coffee 등). 비우면 버튼 숨김.
  supportUrl: ''
};
