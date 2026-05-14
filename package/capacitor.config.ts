import type { CapacitorConfig } from '@capacitor/cli';

/**
 * LectureNote — Capacitor configuration
 *
 * appId 형식: com.<organization>.<appname>  (소문자, 점으로 구분)
 * 시연 후 배포 시에는 변경 가능하지만, 한 번 패키지하면 새 ID로 재배포 시 별도 앱이 됨.
 */
const config: CapacitorConfig = {
  appId: 'com.kbslab.lecturenote',
  appName: 'LectureNote',
  webDir: 'www',

  // www/ 폴더 안의 자산만 사용 (외부 서버를 직접 로드하지 않음 → 디버그 시 file:// 로 동작)
  // 빠른 핫리로드 개발을 위해 server.url 을 임시로 사용할 수 있음 (배포 빌드 시 반드시 주석 처리):
  // server: { url: 'http://192.168.0.10:5500', cleartext: true },

  // HTTPS 만 사용한다면 androidScheme 'https'(기본). 로컬 백엔드(http://192.168.x.x)도 허용해야 한다면
  // 'http' 로 두고 AndroidManifest 의 networkSecurityConfig 에서 도메인을 화이트리스트.
  server: {
    androidScheme: 'https',
  },

  android: {
    allowMixedContent: false,          // production 권장. 시연 시 ngrok/Railway 는 https 이므로 그대로 두면 됨.
    captureInput: true,
    webContentsDebuggingEnabled: true, // chrome://inspect 로 디버깅 가능 (release 빌드에선 false)
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#1A2D5E',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: '#1A2D5E',
      style: 'DARK',          // light text on dark bg
      overlaysWebView: false,
    },
    Filesystem: {
      // Documents directory 사용 (Android: app-specific external storage)
    },
  },
};

export default config;
