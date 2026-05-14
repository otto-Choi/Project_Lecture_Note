# LectureNote — Capacitor (Android)

Multi-modal lecture intelligence pipeline의 모바일 wrapper.

```bash
cd capacitor
npm install
npx cap add android
npx cordova-res android --skip-config --copy \
  --icon-source android-resources/icon.png \
  --icon-background-source "#1A2D5E" \
  --icon-foreground-source android-resources/icon-foreground.png \
  --splash-source android-resources/splash.png
# AndroidManifest.xml 에 권한 추가 (android-patches/AndroidManifest.snippet.xml 참고)
npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 상세 가이드
- [`BUILD_GUIDE.md`](./BUILD_GUIDE.md) — 텍스트 버전
- [`../Build Guide.html`](../Build%20Guide.html) — 시각 가이드 (모바일 프리뷰 포함)

## 핵심 파일
- `capacitor.config.ts` — appId `com.kbslab.lecturenote`, 앱이름 `LectureNote`, Deep Navy 스플래시·상태바
- `www/index.html` — WebView 가 로드하는 리팩토링된 SPA
- `www/assets/app.js` — API URL 해석, 백버튼, PDF 내보내기, 파이프라인 로딩
- `www/assets/styles.css` — design.md 기반 Deep Navy + Sky Blue 시스템
- `android-resources/` — 1024×1024 아이콘 + 2732×2732 스플래시 원본

## 백엔드 URL 변경
앱 상단의 ⚙ 아이콘 → API Base URL 입력. localStorage 에 저장되어 재실행 후에도 유지됩니다.
시연 환경별로 (Railway / ngrok / 같은 Wi-Fi PC) 빠르게 전환 가능.
