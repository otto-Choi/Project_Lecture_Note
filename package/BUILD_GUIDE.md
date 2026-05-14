# LectureNote — Capacitor APK 빌드 가이드

> 기존 FastAPI + 단일 HTML SPA 를 Capacitor 6 로 감싸 Android APK 로 변환하고,
> 실기기에 설치해 시연하기까지의 전체 과정.
>
> 시각화된 한 페이지 가이드는 프로젝트 루트의 [`Build Guide.html`](../Build%20Guide.html) 참고.

---

## TL;DR (한 줄 요약)

```bash
cd capacitor
npm install
npx cap add android
npx cordova-res android --skip-config --copy \
  --icon-source android-resources/icon.png \
  --icon-background-source "#1A2D5E" \
  --icon-foreground-source android-resources/icon-foreground.png \
  --splash-source android-resources/splash.png
# (AndroidManifest.xml 에 권한 추가 — 04번 단계 참고)
npx cap sync android
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 0. 아키텍처 개요

| 단계 | 결과물 | 비고 |
|------|--------|------|
| ① 기존 frontend | `frontend/index.html` (단일파일) | 그대로 유지 |
| ② www/ 리팩토링 | `capacitor/www/*` | API URL 분리, 백버튼, PDF, 폴리시 — **이미 작성됨** |
| ③ Capacitor 래핑 | `capacitor/android/` | `npx cap add android` 가 자동 생성 |
| ④ APK 빌드 | `app-debug.apk` | `./gradlew assembleDebug` |
| ⑤ 실기기 설치 | 폰에서 동작 | `adb install` 또는 사이드로드 |

**핵심:** WebView 는 `capacitor/www/` 의 자산을 로드하고, 거기서 `fetch()` 로 Railway 의 백엔드 API 를 호출합니다. APK 안에는 프론트 코드만 들어가고, 백엔드는 클라우드에 남아 있습니다.

---

## 1. 사전 준비물

| 항목 | 버전 | 확인 명령 |
|------|------|-----------|
| Node.js | v18 이상 (v20 LTS 권장) | `node -v` |
| npm | v9+ | `npm -v` |
| **JDK 17** | Eclipse Temurin / OpenJDK 17 (Capacitor 6 필수) | `java -version` |
| Android Studio | Hedgehog (2023.1.1) 이상 | 1회 실행 후 SDK Platform 34 다운로드 |

### 환경 변수

**macOS / Linux** — `~/.zshrc` 또는 `~/.bashrc` 에 추가:
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"      # mac
# export ANDROID_HOME="$HOME/Android/Sdk"            # linux
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"   # mac
```

**Windows** — PowerShell (관리자):
```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.x", "User")
# PATH 에 %ANDROID_HOME%\platform-tools 추가
```

---

## 2. 제공된 폴더 구조

```
capacitor/
├── package.json                     # Capacitor 의존성
├── capacitor.config.ts              # appId: com.kbslab.lecturenote
├── README.md
├── BUILD_GUIDE.md                   # ← 이 문서
│
├── www/                             # WebView 가 로드
│   ├── index.html                   # 리팩토링된 SPA
│   └── assets/
│       ├── styles.css               # Deep Navy + Sky Blue 시스템
│       ├── app.js                   # 백버튼·PDF·파이프라인 로딩
│       └── icons.svg                # SVG 아이콘 스프라이트
│
├── android-resources/               # cordova-res 입력 (이미 생성됨)
│   ├── icon.png                     # 1024×1024 legacy
│   ├── icon-foreground.png          # 1024×1024 adaptive foreground
│   ├── icon-background.png          # 1024×1024 adaptive background
│   └── splash.png                   # 2732×2732 splash
│
├── android-patches/
│   ├── AndroidManifest.snippet.xml  # 권한 패치 스니펫
│   └── network_security_config.xml  # cleartext 화이트리스트
│
└── android/                         # ← `cap add android` 가 생성
    └── app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. 최초 1회 셋업

### Step 1 — 의존성 설치
```bash
cd capacitor
npm install
```

### Step 2 — Android 플랫폼 추가
```bash
npx cap add android
```
→ `capacitor/android/` 폴더가 새로 생성됩니다.

### Step 3 — 아이콘 / 스플래시 자동 생성
```bash
npx cordova-res android --skip-config --copy \
  --icon-source android-resources/icon.png \
  --icon-background-source "#1A2D5E" \
  --icon-foreground-source android-resources/icon-foreground.png \
  --splash-source android-resources/splash.png
```
→ `android/app/src/main/res/mipmap-*` 와 `drawable-*` 디렉토리에 모든 density 의 리소스가 채워집니다.

### Step 4 — AndroidManifest.xml 패치

`android/app/src/main/AndroidManifest.xml` 의 `<manifest>` 태그 안에 추가:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO"/>
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
<uses-feature android:name="android.hardware.microphone" android:required="false"/>
```

> **같은 Wi-Fi 의 PC 백엔드(http://) 를 쓴다면:**
> `android-patches/network_security_config.xml` 을
> `android/app/src/main/res/xml/network_security_config.xml` 로 복사하고,
> AndroidManifest 의 `<application>` 태그에
> `android:networkSecurityConfig="@xml/network_security_config"` 속성을 추가하세요.
> Railway HTTPS 만 쓰면 불필요합니다.

### Step 5 — 동기화
```bash
npx cap sync android
```
> www/ 를 수정할 때마다 다시 실행. (Capacitor 가 www → android/app/src/main/assets/public 으로 복사)

---

## 4. APK 빌드 (Debug — 시연용)

### 방법 A — 명령어 1줄 (권장)
```bash
cd capacitor/android
./gradlew assembleDebug         # macOS / Linux
gradlew.bat assembleDebug       # Windows
```

결과물:
```
capacitor/android/app/build/outputs/apk/debug/app-debug.apk
```

### 방법 B — Android Studio GUI
1. `npx cap open android` → Android Studio 자동 실행
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. 우측 하단 알림의 **locate** 클릭

> Gradle 첫 빌드는 5~15분, 그 이후 30초~2분.

---

## 5. 실기기 설치 및 시연

### 옵션 1 — USB + adb (가장 안정적)
1. 폰: **설정 → 휴대전화 정보 → 빌드 번호** 7회 탭 → 개발자 모드 ON
2. **설정 → 개발자 옵션 → USB 디버깅** 켜기
3. USB 연결 → 폰의 "USB 디버깅 허용" 다이얼로그 수락
4. ```bash
   adb devices                                # 폰이 보여야 함
   adb install -r capacitor/android/app/build/outputs/apk/debug/app-debug.apk
   ```

### 옵션 2 — APK 파일 직접 전송 (사이드로드)
1. `app-debug.apk` 를 Google Drive / KakaoTalk 나에게 보내기 / 이메일로 폰에 전송
2. 폰에서 APK 탭 → **"출처를 알 수 없는 앱"** 설치 허용
3. 첫 실행 시 마이크 권한 다이얼로그 수락

### 시연 직전 체크리스트
- [ ] Railway 백엔드 `/health` 가 200 OK 응답
- [ ] 강의 1건 + 노트 1건 미리 등록 (cold-start 부담 줄이기)
- [ ] 폰 Wi-Fi / LTE 연결
- [ ] 화면 자동 잠금 5분 이상
- [ ] 앱 상단 ⚙ → API URL 이 올바른 Railway 주소로 설정되어 있는지 확인

---

## 6. 자주 발생하는 오류

| 증상 | 원인 | 해결 |
|------|------|------|
| `SDK location not found` | `ANDROID_HOME` 미설정 | 1번 환경변수 단계 확인 → 터미널 재시작 |
| `Could not find tools.jar` | JDK 버전 미일치 | JDK 17 설치 후 `JAVA_HOME` 재설정 |
| 강의 목록 "불러오지 못함" | API URL / CORS / 백엔드 down | 앱 상단 ⚙ 에서 URL 확인. FastAPI `CORSMiddleware` 가 `allow_origins=["*"]` 인지 확인 |
| 마이크 녹음 "권한 필요" | Manifest 누락 / 사용자가 거부 | 4번의 `RECORD_AUDIO` 확인. 설치된 앱 설정 → 권한 → 마이크 허용 |
| PDF 다운로드 후 파일 안 보임 | Scoped Storage | 공유 다이얼로그로 즉시 전달되거나 `내 파일/Documents/` 에 저장 |
| HTTP 백엔드 fetch 실패 | cleartext traffic 차단 | HTTPS 권장. 또는 `network_security_config.xml` 적용 |
| 설치 시 "패키지 분석 오류" | 손상된 APK / minSdk 미달 | `./gradlew clean assembleDebug` 로 재빌드 |

---

## 7. www/ 가 기존 frontend 와 다른 점 (요약)

| 항목 | 기존 (`frontend/index.html`) | Capacitor 용 (`capacitor/www/`) |
|------|------------------------------|-----------------------------------|
| API URL | `const API = 'http://localhost:8000'` 하드코딩 | `resolveApiBase()` — Capacitor 감지 + localStorage 오버라이드 + ⚙ 설정 시트 |
| 아이콘 | 이모지 (📋 ✏️ 📚 📄 🎙️ 등) | 일관된 SVG 스프라이트 (line 24×24, currentColor) |
| 로고 | 📝 이모지 | Dual book pages SVG (Deep Navy + Sky Blue) |
| 로딩 | 단일 스피너 | 5-스텝 파이프라인 인디케이터 (소스 수집 → STT → Aggregation → Context → 노트 생성) |
| PDF | 없음 | html2pdf.js + Capacitor Filesystem + Share |
| 백버튼 | 없음 | 탭 히스토리 기반 백 (Capacitor App 플러그인) |
| 상태바 | 없음 | StatusBar 플러그인으로 Deep Navy 통일 |
| 스플래시 | 없음 | 부트 스플래시(in-app) + Capacitor SplashScreen |
| 안전영역 | 없음 | `env(safe-area-inset-*)` 로 노치/하단 핸들 회피 |
| 폰트 | Malgun Gothic fallback | Pretendard (design.md 표준) |

---

## 8. Release 빌드 (시연 후 배포 시)

```bash
# 1) 키스토어 생성 (한 번만)
keytool -genkey -v -keystore lecturenote.jks -alias lecturenote \
  -keyalg RSA -keysize 2048 -validity 10000

# 2) android/key.properties
storeFile=../lecturenote.jks
storePassword=...
keyAlias=lecturenote
keyPassword=...

# 3) Release APK
cd capacitor/android
./gradlew assembleRelease

# Play Store 용 AAB
./gradlew bundleRelease
```

---

## 9. www/ 자산을 수정한 다음 재빌드

```bash
cd capacitor
# www/ 수정 후
npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`cap sync` 만 하면 `android/app/src/main/assets/public/` 가 갱신되므로, 코드 변경 → 재빌드 → 재설치 1분 내로 가능합니다.
