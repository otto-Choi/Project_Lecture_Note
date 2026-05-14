# LectureNote — AI 기반 강의 노트 자동 생성 서비스
### 경영전략 9팀 | 5차 발표 이후 업데이트 | 2026-05-15 | **베타 빌드 완료**

---

## 1. 문제 정의

### 현재 대학생의 강의 수강 현실

| 문제 | 설명 |
|------|------|
| **정보 과부하** | 교수 말, 슬라이드, 판서가 동시에 쏟아짐 — 필기와 이해를 동시에 하기 어려움 |
| **필기 품질 불균일** | 집중도·필기 속도에 따라 같은 수업도 노트 완성도 차이가 큼 |
| **복습 자료 부재** | 녹음 파일은 있지만 다시 듣는 데 1~2시간 소요 |
| **시험 대비 비효율** | 슬라이드·녹음·필기를 따로 보면서 핵심을 직접 추려야 함 |

### 핵심 인사이트
> 강의 자료는 이미 존재한다. 문제는 **통합되지 않는 것**이다.

---

## 2. 솔루션 개요

**LectureNote** — 강의계획서(Step 0) + 수업 자료 PDF + 음성 녹음 + 개인 필기를 하나로 합쳐 AI가 시험 대비 최적화 노트를 자동 생성하는 서비스

```
강의계획서  ──┐
수업자료 PDF ──┤──▶ Gemini 2.5-flash ──▶ 통합 요약 노트
음성 녹음   ──┤         (LLM)              (마크다운)
개인 필기   ──┘
```

### 출력 노트 구조 (5개 섹션)
1. **[Overview]** — 이번 주차의 강의 흐름 내 위치와 의미
2. **[Integrated Notes]** — 중요도(★) + [Lecture Only] 태그 통합 정리
3. **[Professor's Secret Tips]** — 교수님 직접 강조 힌트 추출
4. **[Core Memorization List]** — 핵심 키워드·정의·공식 표
5. **[Self-Exam]** — Step 0 출제 경향 기반 예상 문제 (서술형 2개 + 객관식 3개)

---

## 3. 개발 여정 (단계별 진행)

| 단계 | 시기 | 내용 |
|------|------|------|
| 1단계 | 초기 | 백엔드 기본 구조 (FastAPI + SQLite + PDF 파서) |
| 2단계 | — | 서버 구동 및 SDK 마이그레이션 (google.genai) |
| 3단계 | — | STT 서비스 연동 (CLOVA 시도 → Gemini 멀티모달로 전환) |
| 4단계 | — | HTML 다운로드 기능 (weasyprint 한계 → 브라우저 Ctrl+P 방식) |
| 5단계 | 2026-04-27 | 코드 리뷰 및 버그 수정 |
| 6단계 | 2026-05-06 | 프론트엔드 초기 구현 (3탭 SPA, 인앱 녹음, 강의 카드 목록) |
| 7단계 | 2026-05-07 | **알파 빌드** — 모바일 앱 UI, 실시간 스트리밍, 노트 편집/삭제, 완료 알림 |
| **8단계** | **2026-05-08** | **STT 성능 최적화** — `thinking_budget=0` + `asyncio.gather` 병렬 처리 |
| **9단계** | **2026-05-10** | **스트리밍 UX** — 자동 스크롤 + 수동 스크롤 시 멈춤 감지 |
| **10단계** | **2026-05-12** | **사용자 인증 시스템** — 로그인·회원가입·세션·사용자별 데이터 격리 |
| **11단계** | **2026-05-15** | **베타 빌드** — Pipeline A UI, Profile B, 아이콘 스프라이트 37개 |

---

## 4. 현재 주요 기능 (베타 빌드 기준)

### 4-1. 사용자 인증 시스템 *(신규)*
- 온보딩 → 로그인 / 회원가입 2-step 플로우
- SHA256+salt 세션 토큰 (72h TTL) — localStorage 자동 로그인 지원
- 사용자별 데이터 완전 격리 (강의·노트 모두 user_id 연결)
- 앱 초기화 시 토큰 검증 완료 전까지 스플래시 유지 (UI 플래시 방지)

### 4-2. 파이프라인 스텝 인디케이터 *(신규, Pipeline A)*
- 5단계 진행 상태 시각화 (연결선·서브텍스트·경과 시간 카운터)
- STT 완료 → SSE 시작 시 스텝 자동 전환
- 현재 처리 중인 단계 펄스 애니메이션

### 4-3. 프로필 화면 *(신규, Profile B)*
- 그라디언트 헤더 + 아바타 이니셜 자동 생성
- 가입 후 경과일·생성 노트 수·등록 강의 수 통계
- 프로필 편집 (이름·학교·전공), 비밀번호 변경, 계정 삭제

### 4-4. STT 성능 최적화 *(개선)*
- `thinking_budget=0` 적용으로 STT·메타 분석 응답 속도 대폭 향상
- `asyncio.gather`로 PDF 파싱·STT 병렬 처리 → 전체 파이프라인 대기 시간 단축

### 4-5. 모바일 앱 스타일 UI
- 최대 너비 430px 앱 셸 — 스마트폰 화면처럼 표시
- 하단 고정 네비게이션 바 (강의 등록 / 노트 생성 / 노트 조회)
- SVG 아이콘 스프라이트 37개 (인증·프로필·기능 아이콘 포함)

### 4-6. 원클릭 강의 등록
- 강의계획서 PDF 업로드 → Gemini가 커리큘럼 전체 분석
- 과목명·교수명 자동 추출 및 저장
- 주차별 학습 로드맵 (Step 0) 즉시 확인

### 4-7. 실시간 스트리밍 노트 생성
- 음성 녹음(인앱 or 파일) + PDF + 필기를 동시에 업로드
- SSE 스트리밍 — 노트가 타이핑되듯 실시간으로 표시
- 스트리밍 중 자동 스크롤 (수동 스크롤 시 자동 멈춤)

### 4-8. 노트 관리
- 강의별 주차 노트 목록 조회, 인라인 편집·삭제
- HTML 다운로드 (`?token=` 쿼리 파라미터 방식 — `window.open()` 인증 우회)

---

## 5. 기술 스택

| 계층 | 기술 | 역할 |
|------|------|------|
| **AI** | Gemini 2.5-flash | LLM 노트 생성, STT 음성 변환, 메타데이터 추출 |
| **백엔드** | FastAPI + Python | REST API (17개), SSE 스트리밍 |
| **인증** | SHA256+salt + 세션 토큰 | 72h TTL, localStorage 자동 로그인 |
| **DB** | SQLite + SQLAlchemy | 강의·노트·소스·사용자·세션 저장 |
| **PDF 파싱** | PyMuPDF (fitz) | PDF → 텍스트 추출 |
| **프론트엔드** | Vanilla HTML/CSS/JS | 멀티스크린 SPA (Auth / Main App / Profile) |
| **마크다운** | marked.js (CDN) | 생성 노트 렌더링 |
| **녹음** | MediaRecorder API | 브라우저 내 음성 녹음 |

---

## 6. 시스템 아키텍처

```
[브라우저 - index.html]
    │ Auth Screen (Onboarding / Login / Signup)
    │ Main App   (강의 등록 / 노트 생성 / 노트 조회)
    │ Profile    (통계 / 편집 / 비밀번호 변경 / 계정 삭제)
    │
    │ HTTP / SSE  (Authorization: Bearer <token>)
    ▼
[FastAPI 서버 - main.py]
    ├── /api/auth/*              ──▶ auth.py (hash, session, get_current_user)
    │
    ├── POST /api/create-step0   ──▶ pdf_parser ──▶ llm_service.analyze_syllabus()
    │                                           ──▶ llm_service.extract_lecture_meta()
    │
    ├── POST /api/generate-note  ──▶ asyncio.gather(
    │   (StreamingResponse SSE)  │       pdf_parser,
    │                            │       stt_service.process_audio_to_text()
    │                            │   )
    │                            ──▶ aggregator.aggregate_sources()
    │                            ──▶ llm_service.generate_lecture_note_stream()
    │                                    │
    │                                    ▼ 청크 단위 SSE 전송
    │
    └── PATCH/DELETE /api/notes, /api/lectures, /api/download-note

[SQLite - lecture.db]
    ├── users    (id, username, display_name, school, major, plan, locale)
    ├── sessions (user_id, token, expires_at)
    ├── lectures (id, user_id, title, subject, step0_analysis)
    ├── sources  (lecture_id, type, content)
    └── outputs  (lecture_id, week, summary)
```

---

## 7. API 엔드포인트 (17개)

### Auth

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST   | `/api/auth/register` | 회원가입 |
| POST   | `/api/auth/login` | 로그인 → Bearer 토큰 반환 |
| POST   | `/api/auth/logout` | 세션 무효화 |
| GET    | `/api/auth/me` | 현재 사용자 정보 |
| PATCH  | `/api/auth/me` | 프로필 수정 |
| PATCH  | `/api/auth/password` | 비밀번호 변경 |
| DELETE | `/api/auth/me` | 계정 및 전체 데이터 삭제 |
| GET    | `/api/auth/stats` | 강의·노트 통계 |

### Core Pipeline

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST   | `/api/create-step0` | 강의계획서 분석 등록 |
| POST   | `/api/generate-note` | 노트 생성 (SSE 스트리밍) |
| GET    | `/api/lectures` | 사용자 강의 목록 |
| DELETE | `/api/lectures/{id}` | 강의 삭제 (cascade) |
| GET    | `/api/lectures/{id}/notes` | 주차별 노트 목록 |
| GET    | `/api/notes/{id}` | 노트 내용 |
| PATCH  | `/api/notes/{id}` | 노트 편집 |
| DELETE | `/api/notes/{id}` | 노트 삭제 |
| GET    | `/api/download-note/{id}` | HTML 다운로드 (`?token=` 지원) |

---

## 8. 데모 시나리오

### 준비물
- 강의계획서 PDF
- 수업 자료 PDF (슬라이드 등)
- 음성 녹음 파일 (m4a/webm/mp3) — 또는 인앱 녹음

### 데모 순서

**Step 1 — 서버 실행**
```bash
launch.bat
# 또는: uvicorn main:app --reload --app-dir src
```

**Step 2 — 회원가입 / 로그인**
1. 브라우저에서 `http://localhost:8000` 접속
2. 온보딩 화면 → 회원가입 (2-step)
3. 로그인 → 메인 앱 진입

**Step 3 — 강의 등록 탭**
1. 강의계획서 PDF 드래그앤드롭
2. "강의 등록하기 →" 클릭
3. AI가 커리큘럼 분석 후 과목명·교수명 자동 표시

**Step 4 — 노트 생성 탭**
1. 강의 카드 선택
2. 녹음 파일 업로드 or 인앱 녹음
3. 수업자료 PDF 업로드 → "노트 생성하기 →"
4. **Pipeline A 인디케이터로 5단계 진행 확인**
5. **실시간 스트리밍으로 노트가 작성되는 것을 확인**

**Step 5 — 노트 조회 / 프로필**
1. 노트 탭 → 강의 선택 → 주차 노트 목록
2. 노트 클릭 → 편집·다운로드
3. 우상단 프로필 아이콘 → Profile B 화면 확인

---

## 9. 핵심 차별점

| 항목 | 기존 방식 | LectureNote |
|------|-----------|-------------|
| 노트 작성 | 수강 중 직접 필기 | AI 자동 생성 |
| 정보 통합 | 파일별 따로 확인 | 4개 소스 통합 |
| 시험 대비 | 직접 핵심 추출 | [Self-Exam] 자동 제공 |
| 강의 맥락 | 매 주차 독립적 | Step 0 로드맵 연결 |
| 결과 확인 | 생성 완료 후 일괄 | **실시간 스트리밍** |
| 처리 현황 | 무응답 대기 | **Pipeline A 단계별 표시** |
| 데이터 격리 | 공유 저장소 | **사용자 인증 + 개인화** |

---

## 10. 향후 개발 계획

| 우선순위 | 기능 | 상태 |
|----------|------|------|
| ✅ 완료 | STT 성능 최적화 (`thinking_budget=0` + 병렬 처리) | 완료 |
| ✅ 완료 | 스트리밍 자동 스크롤 | 완료 |
| ✅ 완료 | 사용자 인증 시스템 | 완료 |
| ✅ 완료 | 파이프라인 스텝 인디케이터 (Pipeline A) | 완료 |
| ✅ 완료 | 프로필 화면 (Profile B) | 완료 |
| 높음 | 이미지 업로드 (칠판 필기 사진 → Gemini Vision OCR) | 대기 |
| 높음 | PWA 매니페스트 → 모바일 홈 화면 설치 | 대기 |
| 중간 | 처리 메타데이터 표시 (소스 구성·처리 시간) | 대기 |
| 중간 | 노트 키워드 검색 | 대기 |

---

## 11. 실행 방법 요약

### 환경 설정
```bash
pip install fastapi uvicorn python-multipart sqlalchemy pymupdf google-genai python-dotenv markdown
```

### `.env` 파일
```
GEMINI_API_KEY=your_api_key_here
```

### 실행
```bash
launch.bat
# 또는 직접: uvicorn main:app --reload --app-dir src
```
→ `http://localhost:8000` 접속 (FastAPI가 프론트엔드 직접 서브)

---

*LectureNote — 경영전략 9팀*