// 수익화 설정 — 이 파일만 고치면 됩니다.
window.GAME_CONFIG = {
  ads: {
    // 'mock'    : 테스트용 가짜 광고 (기본값, 수익 없음)
    // 'adsense' : Google AdSense H5 게임 광고 (실제 수익)
    // 'none'    : 광고 끔 (보상은 그냥 지급)
    provider: 'mock',
    adsenseClient: 'ca-pub-0000000000000000', // 본인 AdSense 게시자 ID
    testMode: true,          // 실서비스 전에 false 로 변경
    interstitialEvery: 3     // N판마다 전면 광고 1회
  },
  // 후원/광고제거 결제 링크 (Ko-fi, 토스 아이디, Buy Me a Coffee 등). 비우면 버튼 숨김.
  supportUrl: ''
};
