# LectureNote · 인증/계정 UI 추가 작업 정리

> 작성일: 2026-05-15  
> 대상: `lecture_note_project` (FastAPI + Capacitor 기반)

---

## 1. 작업 개요

기존 SPA(`public/index.html`) 위에 **로그인·회원가입·유저별 데이터 분리**를 위한 UI 시안과 클릭 가능한 프로토타입을 추가했습니다.  
`models.py`에 이미 정의된 `User` / `Session` / `Lecture.user_id` 스키마를 그대로 따릅니다.

부가적으로 `docs/요청.md`에 있던 **Gemini 파이프라인 진행 상태 표시 개선**도 함께 다뤘습니다.

---

## 2. 산출물

| 파일 | 역할 |
|---|---|
| `Login Signup Designs.html` | 전체 시안 캔버스 — 모든 변주(2~3안)를 한 화면에서 비교 |
| `LectureNote Prototype.html` | **선택된 안만 연결한 클릭 가능한 프로토타입** |
| `screens/shared.jsx` | 공통: Phone 셸, 컬러 토큰, 입력 필드, 버튼, 아이콘, AppBar, BottomNav |
| `screens/onboarding.jsx` | 미인증 진입 웰컴 화면 |
| `screens/login.jsx` | 로그인 화면 (A·B·C 3안) |
| `screens/signup.jsx` | 회원가입 (단일 폼 A, 2-스텝 B) |
| `screens/find.jsx` | 아이디 / 비밀번호 찾기 + 결과 화면 |
| `screens/profile.jsx` | 프로필 (바텀 시트 A, 풀페이지 B) |
| `screens/pipeline.jsx` | Gemini 파이프라인 진행 UI (A·B·C 3안) |
| `screens/main-app.jsx` | 로그인 후 메인(강의 등록 탭) 미니 재현 |
| `screens/account.jsx` | 비밀번호 변경 / 가입 정보(+회원탈퇴) / 구독 플랜 / 언어 설정 |
| `assets/styles.css`, `assets/icons.svg` | 기존 프로젝트에서 그대로 가져온 디자인 토큰 / 아이콘 스프라이트 |

---

## 3. 최종 선택된 안

| 항목 | 선택 | 이유 |
|---|---|---|
| 온보딩 | **A · 풀스크린 웰컴** | 가치 제안 카드 3개 + 회원가입/로그인 CTA |
| 로그인 | **A · Navy 헤더 + 화이트 카드** | "상단 1/3 Navy, 하단 흰 카드" 톤 + **자동 로그인** 체크 |
| 회원가입 | **B · 2-스텝** | Step 1 계정(+이메일) → Step 2 프로필·약관, 진행률 시각화 |
| 프로필 | **B · 풀페이지 내정보** | 그라데이션 헤더 + 통계 + 설정/계정/위험 영역 분리 |
| 파이프라인 | **A · 스텝리스트** | 단계별 서브 상태 텍스트 + 경과 시간 + 연결선 |

---

## 4. 새로 추가한 기능

### 4-1. 인증 흐름
- 스플래시 → 온보딩 → 로그인 / 회원가입 / 아이디·비번 찾기 → 메인
- **자동 로그인**: 로그인 시 체크하면 `localStorage`에 저장, 다음 진입 시 스플래시 후 메인 직행
- **로그아웃**: 프로필 풀페이지 하단에서 진행 → 로그인 화면 복귀
- **앱바 사용자 아이콘**: 우측 원형 아이콘 (이니셜 표시) → 프로필 화면

### 4-2. 회원가입 (B, 2-스텝)
**Step 1 — 계정 정보**
- 아이디 (3–20자 영문/숫자, 사용 가능 여부 helper 표시)
- **이메일 (신규 추가)** — 비밀번호 재설정·중요 알림용
- 비밀번호 + 비밀번호 확인 + 안전도 게이지

**Step 2 — 프로필 + 약관**
- 이름/닉네임, 학교, 학과
- 전체 동의 / 이용약관(필수) / 개인정보 처리방침(필수) / 마케팅 수신(선택)
- 필수 두 항목 동의 전까지 "가입하고 시작하기" 버튼 비활성

### 4-3. 계정 관리 (프로필 B의 하위 페이지) — **신규**
- **비밀번호 변경**
  - 현재 비번 → 새 비번 → 새 비번 확인
  - 실시간 안전도 게이지 (약함/보통/강함)
  - 비밀번호 규칙 체크리스트 (8자 이상 / 영문 / 숫자 / 특수문자)
- **가입 정보**
  - 계정/프로필/이용 내역 표시 (아이디·이메일·가입일·등록 강의 수 등)
  - 이메일·이름 옆 인라인 "변경/편집" 버튼
  - 하단 **위험 영역**: 회원탈퇴 → 확인 모달("탈퇴합니다" 입력 → 진행)
- **구독 플랜**
  - Free / Pro (인기 배지) / Team 3개 카드
  - 현재 플랜 표시, 선택 시 강조 + 하단 CTA 동적 변경
  - 7일 무료 체험 안내
- **언어 설정** (기존 "API 서버 주소" 자리 교체)
  - 한국어 / English / 日本語 / 中文(简体)
  - 국기 이모지 + 영문·한글 부제

### 4-4. 파이프라인 진행 UI (A)
- 5단계: 강의 정보 → PDF 분석 → STT → 노트 생성 → 저장
- 각 단계마다 done / active / pending 상태 + 서브 텍스트(예: "Gemini STT 처리 중... 47%")
- 단계 간 연결선이 진행에 따라 Green으로 채워짐
- 경과 시간 표시 + N/5 완료 카운터

---

## 5. 유저 이용 흐름

### 5-1. 첫 진입 (미가입 / 미인증)
```
스플래시 (1.4초)
   ↓
온보딩 웰컴
   ├─ [회원가입하고 시작하기]  → 회원가입 Step 1
   ├─ [이미 계정이 있어요 · 로그인] → 로그인 A
   └─ "로그인 없이 둘러보기 →"  → 메인 (게스트 모드)
```

### 5-2. 회원가입
```
회원가입 Step 1 (계정)
   - 아이디 / 이메일 / 비밀번호 / 비밀번호 확인 입력
   - [다음 단계로]  →  Step 2
   - "이미 계정이 있으신가요? 로그인" → 로그인 A

회원가입 Step 2 (프로필 + 약관)
   - 이름 / 학교 / 학과 입력
   - 약관 동의 (필수 2개 + 선택 1개)
   - [가입하고 시작하기]  →  자동 로그인 + 메인
```

### 5-3. 로그인
```
로그인 A
   - 아이디 / 비밀번호 입력
   - ☑ 자동 로그인  (체크 시 localStorage 저장)
   - [로그인]  →  메인
   - "비밀번호 찾기"  →  계정 찾기 (비밀번호 탭)
   - "아이디 찾기 | 비밀번호 찾기"  →  계정 찾기
   - "처음이신가요? 회원가입 →"  →  회원가입 Step 1
```

### 5-4. 계정 찾기
```
아이디 찾기
   - 이름 + 학교 입력  →  [아이디 찾기]  →  결과 화면 (찾은 아이디 표시)
   - 결과: [비밀번호 찾기] / [로그인하러 가기]

비밀번호 찾기
   - 아이디 입력  →  가입 시 이메일로 임시 비밀번호 발송
   - [임시 비밀번호 받기]
```

### 5-5. 메인 → 프로필
```
메인 앱 (상단 앱바 우측 사용자 아이콘 탭)
   ↓
프로필 B (내 정보)
   - 그라데이션 헤더: 아바타·이름·@아이디·학교/학과·[편집]
   - 통계: 등록 강의 / 생성 노트 / 이번 주
   - 설정 카드: 다크모드 토글 · 푸시 알림 토글 · 언어 설정
   - 계정 카드: 비밀번호 변경 · 가입 정보 · 구독 플랜
   - 로그아웃 (위험 영역)
```

### 5-6. 계정 관리 하위 흐름
```
프로필 B
 ├─ 언어 설정          → 한국어/English/日本語/中文 중 선택
 ├─ 비밀번호 변경      → 현재 비번 + 새 비번(×2) → [변경] → 프로필
 ├─ 가입 정보          → 계정·프로필·이용 내역 확인
 │     └─ 회원탈퇴 진행 → 확인 모달 → "탈퇴합니다" 입력 → 데이터 삭제 + 로그아웃
 ├─ 구독 플랜          → Free/Pro/Team 선택 → 결제 (Pro/Team)
 └─ 로그아웃           → 자동 로그인 해제 + 로그인 화면 복귀
```

### 5-7. 노트 생성 시 파이프라인
```
메인 (강의 등록 또는 노트 생성)
   ↓ [실행 버튼]
파이프라인 A (5단계 자동 진행)
   ① 강의 정보 불러오기  (DB 조회)
   ② PDF 분석            (PyMuPDF 텍스트 추출)
   ③ 수업 녹음 분석      (Gemini STT)
   ④ 소스 통합 · 노트 생성 (Gemini 스트리밍)
   ⑤ 저장 및 마무리      (Output 테이블 저장)
   ↓ 완료
메인 (결과 카드 표시)
```

---

## 6. 백엔드 통합 가이드

### 6-1. 추가 필요 엔드포인트

```python
# src/main.py 에 추가
from passlib.hash import pbkdf2_sha256
import secrets
from datetime import timedelta

@app.post("/api/auth/signup")
def signup(username: str, email: str, password: str, name: str,
           school: str = "", major: str = "",
           db: Session = Depends(get_db)):
    # 중복 체크
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(409, "이미 사용 중인 아이디입니다.")
    salt = secrets.token_hex(16)
    pw_hash = pbkdf2_sha256.hash(password + salt)
    user = models.User(username=username, password_hash=pw_hash, salt=salt)
    db.add(user); db.commit(); db.refresh(user)
    token = _issue_session(db, user.id)
    return {"token": token, "user": _user_dict(user)}

@app.post("/api/auth/login")
def login(username: str, password: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not pbkdf2_sha256.verify(password + user.salt, user.password_hash):
        raise HTTPException(401, "아이디 또는 비밀번호가 올바르지 않습니다.")
    token = _issue_session(db, user.id)
    return {"token": token, "user": _user_dict(user)}

@app.post("/api/auth/logout")
def logout(authorization: str = Header(None), db: Session = Depends(get_db)):
    token = authorization.replace("Bearer ", "")
    db.query(models.Session).filter(models.Session.token == token).delete()
    db.commit()
    return {"ok": True}

@app.get("/api/auth/me")
def me(user: models.User = Depends(current_user)):
    return _user_dict(user)

@app.delete("/api/auth/me")
def delete_account(user: models.User = Depends(current_user),
                   db: Session = Depends(get_db)):
    db.delete(user)  # cascade로 lectures/sessions 모두 삭제
    db.commit()
    return {"ok": True}

@app.patch("/api/auth/password")
def change_password(current_pw: str, new_pw: str,
                    user: models.User = Depends(current_user),
                    db: Session = Depends(get_db)):
    if not pbkdf2_sha256.verify(current_pw + user.salt, user.password_hash):
        raise HTTPException(401, "현재 비밀번호가 올바르지 않습니다.")
    user.salt = secrets.token_hex(16)
    user.password_hash = pbkdf2_sha256.hash(new_pw + user.salt)
    db.commit()
    return {"ok": True}
```

### 6-2. 기존 라우트에 user_id 필터 적용

```python
def current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not authorization:
        raise HTTPException(401, "로그인이 필요합니다.")
    token = authorization.replace("Bearer ", "")
    sess = db.query(models.Session).filter(
        models.Session.token == token,
        models.Session.expires_at > datetime.utcnow()
    ).first()
    if not sess:
        raise HTTPException(401, "세션이 만료되었습니다. 다시 로그인해주세요.")
    return sess.user

# 적용 예시
@app.get("/api/lectures")
def list_lectures(user: models.User = Depends(current_user),
                  db: Session = Depends(get_db)):
    lectures = db.query(models.Lecture).filter(
        models.Lecture.user_id == user.id
    ).order_by(models.Lecture.id.desc()).all()
    return [...]

# create-step0, generate-note 등 모든 lecture 관련 라우트에서
# 새 Lecture 생성 시 user_id=user.id 지정
# get/delete 시 lecture.user_id == user.id 검증
```

### 6-3. User 모델에 추가 필드 (선택)

```python
# models.py - User 모델에 추가
email = Column(String(120), unique=True, nullable=True)
display_name = Column(String(64), nullable=True)
school = Column(String(120), nullable=True)
major = Column(String(120), nullable=True)
locale = Column(String(8), default="ko")
plan = Column(String(16), default="free")  # free / pro / team
```

---

## 7. 프론트엔드 통합 시 체크리스트

기존 `public/index.html`은 바닐라 JS인데 시안은 React로 만들어져 있습니다. 둘 중 하나 선택:

**A. 바닐라 JS로 재작성** (기존 톤 유지)
- `styles.css`에 이미 정의된 `.card`, `.btn`, `.form-group`, `.sheet` 클래스 재사용
- 라우팅은 `showTab()` 함수처럼 화면 전환 함수 추가 (`showAuth('login'|'signup'|...)`)
- 인증 토큰은 `localStorage.lectureNoteToken`에 저장, `fetch` 호출 시 헤더 추가
- 앱 부팅 시 `/api/auth/me` 호출 → 401이면 로그인 화면, 200이면 기존 메인

**B. React 기반으로 통합** (이번 프로토타입 그대로)
- `public/index.html` 자체를 React SPA로 교체
- 기존 강의 등록 / 노트 생성 / 노트 조회 탭도 React 컴포넌트로 포팅 필요
- 빌드 도구(esbuild, vite 등) 도입 또는 현재처럼 Babel standalone 유지

---

## 8. 변경 요약 (어떤 안이 어떤 화면이 됐는지)

| 작업 시점 | 항목 | 결정 |
|---|---|---|
| 1차 시안 | 로그인 3안 | **A 선택** |
| 1차 시안 | 회원가입 2안 | 처음엔 A → 이후 **B로 변경** |
| 1차 시안 | 프로필 2안 | **B 선택** |
| 1차 시안 | 파이프라인 3안 | **A 선택** |
| 1차 시안 | 온보딩 2안 | **A 선택** |
| 추가 요청 1 | 로그인 A에 자동 로그인 | 체크박스 + localStorage |
| 추가 요청 2 | 비밀번호 변경 기능 | 신규 화면 추가 |
| 추가 요청 2 | 회원탈퇴 기능 | 가입 정보 → 위험 영역 |
| 추가 요청 2 | 구독 플랜 페이지 | 신규 화면 (Free/Pro/Team) |
| 추가 요청 2 | 회원가입에 이메일 | Step 1에 필드 추가 |
| 추가 요청 2 | API 서버 주소 제거 | **언어 설정**으로 교체 |

---

*문의 / 추가 변경 사항은 chat으로 이어서 진행해주세요.*
