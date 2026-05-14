# LectureNote 프로젝트 개발 히스토리

## 프로젝트 개요
FastAPI 기반 강의 노트 자동 생성 백엔드. 강의계획서(PDF), 수업자료(PDF), 음성 녹음(STT), 개인 필기를 받아 Gemini LLM으로 통합 요약 노트를 생성한다.

---

## 1단계: 초기 구현 (이전 세션)

### 구현 파일
- `database.py` — SQLAlchemy 엔진, 세션, Base, get_db
- `models.py` — Lecture / Source / Output ORM 테이블
- `services/pdf_parser.py` — PyMuPDF(fitz)로 PDF → 텍스트 변환
- `services/stt_service.py` — CLOVA Speech API Mock (하드코딩 텍스트 반환)
- `services/aggregator.py` — 4개 소스를 STEP 태그로 병합
- `services/llm_service.py` — Gemini API 호출 (`google.generativeai`)
- `main.py` — FastAPI 앱, 2개 엔드포인트

### 코드 리뷰에서 발견된 버그 (이전 세션)
1. `services/__init__.py` 누락 → 패키지 인식 불가 (치명적)
2. `stt_service.py`의 `import os` 미사용 → 주석 처리
3. `main.py`에서 `db.refresh(output)` 누락 → `output.id` 접근 불가

---

## 2단계: 서버 구동 시도 및 에러 해결

### 문제 1: `python-multipart` 미설치
- **증상**: 서버 시작 시 `RuntimeError: Form data requires "python-multipart"`
- **원인**: FastAPI의 Form/File 파라미터 처리에 필요한 패키지 누락
- **해결**: `pip install python-multipart`

---

### 문제 2: `google.generativeai` SDK 지원 종료
- **증상**: `FutureWarning: All support for the google.generativeai package has ended`
- **원인**: 구 SDK deprecated, 신규 SDK로 마이그레이션 필요
- **결정**: `google.generativeai` → `google.genai` (신규 SDK)로 전환
- **변경 사항** (`llm_service.py`):
  ```python
  # 이전
  import google.generativeai as genai
  genai.configure(api_key=...)
  model = genai.GenerativeModel(model_name=..., system_instruction=...)
  response = model.generate_content(user_prompt)

  # 이후
  from google import genai
  from google.genai import types
  client = genai.Client(api_key=...)
  response = client.models.generate_content(
      model=..., contents=...,
      config=types.GenerateContentConfig(system_instruction=...)
  )
  ```
- **추가 설치**: `pip install google-genai`

---

### 문제 3: 모델 ID `gemini-1.5-pro` 404 오류
- **증상**: `ClientError: 404 NOT_FOUND. models/gemini-1.5-pro is not found for API version v1beta`
- **원인**: 신규 SDK(v1beta)에서 `gemini-1.5-pro` 미지원
- **1차 변경**: `gemini-1.5-pro` → `gemini-2.0-flash`
- **재발**: `gemini-2.0-flash is no longer available to new users`
- **최종 결정**: `gemini-2.0-flash` → `gemini-2.5-flash`

---

### 문제 4: Gemini API 429 할당량 초과
- **증상**: `ClientError: 429 RESOURCE_EXHAUSTED. limit: 0`
- **원인**: 서버가 굳어있는 동안 SDK 내부 재시도가 반복되어 무료 일일 한도 소진
- **해결**: Google AI Studio 계정에 결제 수단 등록

---

## 3단계: STT 서비스 연동 시도

### 목표
Mock STT → 실제 CLOVA Speech API 연동

### 시도 1: CLOVA Speech Recognition (CSR) — `naveropenapi.apigw.ntruss.com`
- **배경**: 사용자가 `https://naveropenapi.apigw.ntruss.com/recog/v1` URL을 검색으로 찾음
- **시도**: `X-NCP-APIGW-API-KEY-ID` + `X-NCP-APIGW-API-KEY` 헤더로 호출
- **결과**: `401 Unauthorized`
- **원인**: 사용자가 보유한 것은 CSR이 아닌 CLOVA Speech (VPC) 서비스

### 시도 2: CLOVA Speech (VPC) — Invoke URL 방식
- **배경**: NCP CLOVA Speech 서비스는 도메인별 Invoke URL + Secret Key 방식
- **초기 오류**: Invoke URL 없이 구현 → `None/recognizer/upload` URL로 호출
  - `MissingSchema: Invalid URL 'None/recognizer/upload'`
  - 원인: `.env`에 `CLOVA_INVOKE_URL` 변수명 불일치
- **해결**: `stt_service.py`에 `load_dotenv()` 추가, 변수명 통일

### 시도 3: `/recognizer/bytes` 엔드포인트
- **시도**: `Content-Type: audio/mp4`, raw bytes 전송
- **결과**: `ChunkedEncodingError: Response ended prematurely`
- **원인**: 해당 엔드포인트가 이 API에서 정상 작동하지 않음

### 시도 4: `/recognizer/upload` multipart 방식
- **변경**: `files={"media": ..., "params": ...}` multipart/form-data 전송
- **결과**: `400 Bad Request` (진전)
- **디버깅**: `print(response.text)` 추가로 실제 응답 확인
- **실제 응답**: `{"result":"FAILED","message":"제공되는 무료 인식 시간을 초과했습니다."}`
- **원인**: CLOVA Speech 무료 인식 시간 소진 (도메인 재생성 필요)

### 최종 결정: Gemini STT로 전환
- **배경**: CLOVA 무료 한도 소진, 별도 API 추가 없이 기존 Gemini 키 활용 가능
- **방식**: `types.Part.from_bytes()`로 오디오 바이트를 Gemini에 직접 전달
- **최종 `stt_service.py`**:
  ```python
  from google import genai
  from google.genai import types

  def process_audio_to_text(audio_bytes: bytes) -> str:
      response = client.models.generate_content(
          model="gemini-2.5-flash",
          contents=[
              types.Part.from_bytes(data=audio_bytes, mime_type="audio/mp4"),
              "이 음성을 한국어로 그대로 받아쓰기 해줘. 말한 내용만 출력하고 다른 설명은 하지 마.",
          ],
      )
      return response.text
  ```

---

## 4단계: 노트 다운로드 기능 추가

### 목표
생성된 마크다운 노트를 파일로 다운로드할 수 있는 엔드포인트 추가

### 시도 1: weasyprint — HTML → PDF 변환
- **시도**: `pip install weasyprint markdown`
- **결과**: 서버 시작 시 `OSError: cannot load library 'libgobject-2.0-0'`
- **원인**: weasyprint는 Windows에서 GTK 런타임(Pango, Cairo) 별도 설치 필요
- **결정**: weasyprint 포기

### 시도 2: xhtml2pdf — 순수 Python HTML → PDF
- **시도**: `pip install xhtml2pdf`
- **문제 1**: 한국어 폰트 깨짐 → CSS `@font-face`로 `malgun.ttf` 지정 시도
- **문제 2**: `@font-face` 방식은 xhtml2pdf가 폰트를 임시 폴더에 복사하다 `PermissionError` 발생
- **시도**: reportlab에 폰트 직접 등록(`pdfmetrics.registerFont()`) 후 CSS에서만 참조
- **문제 3**: 폰트 등록 후에도 한국어 여전히 깨짐, 줄간격 과도하게 넓음
- **원인**: xhtml2pdf의 한국어 지원이 근본적으로 불안정

### 최종 결정: HTML 파일 다운로드
- **배경**: 브라우저는 시스템 폰트를 그대로 사용하므로 한국어 완벽 렌더링
- **방식**: markdown → HTML 변환 후 `Content-Disposition: attachment`로 `.html` 파일 제공
- **PDF 변환**: 브라우저에서 열고 `Ctrl+P → PDF로 저장`
- **엔드포인트**: `GET /api/download-note/{output_id}`

---

## 5단계: 최종 코드 리뷰 (2026-04-27)

### 발견 및 수정된 문제
1. **`main.py` docstring 오류**: `download_note` 함수 설명이 "PDF 파일로 다운로드"라고 되어 있었으나 실제로는 HTML 반환 → 수정
2. **`models.py` dead code**: `Output.quiz` 컬럼이 정의되어 있으나 코드 어디서도 저장하지 않음 → 컬럼 제거
3. **`models.py` deprecated API**: `datetime.utcnow`가 Python 3.12+에서 deprecated → `datetime.now(timezone.utc)` 람다로 교체

---

---

## 6단계: 프론트엔드 초기 개발 (2026-05-06) — 4차 발표 대비 알파 빌드

### 목표
3차 발표 다음 단계인 **8주차 알파 빌드** 달성: 사용자가 코드 없이 사용 가능한 웹 UI + 원클릭 녹음 기능

### 구현 내용

**신규 파일: `frontend/index.html`** (단일 파일 SPA, 빌드 도구 불필요)
- CDN marked.js로 마크다운 렌더링
- 3탭 구조: 강의 등록 / 노트 생성 / 노트 조회
- 브라우저 MediaRecorder API 기반 인앱 녹음 (원클릭 시작/중지, 타이머)
- 강의 카드 목록 선택/삭제, 등록 시 과목명·교수명 LLM 자동 추출
- `const API = 'http://localhost:8000'` — CORS로 백엔드 직접 호출 (StaticFiles 미사용)

**`main.py` 주요 변경:**
- `CORSMiddleware` 추가 (allow_origins=["*"])
- `GET /api/lectures`, `DELETE /api/lectures/{id}` 추가
- `POST /api/create-step0`: title/subject 파라미터 제거 → LLM 자동 추출
- `GET /api/lectures/{id}/notes`, `GET /api/notes/{id}` 추가

**`services/llm_service.py`:**
- `extract_lecture_meta(step0_text)` 추가 — 과목명·교수명 자동 파싱

**`models.py`:**
- `Output.week` 컬럼 추가 (Integer, nullable) — 주차 번호 저장

### 접속 방법
```bash
uvicorn main:app --reload
# frontend/index.html 파일을 브라우저에서 직접 열기
# Swagger UI: http://localhost:8000/docs
```

---

## 7단계: UI/UX 개선 및 기능 고도화 (2026-05-07) — 알파 빌드 완료 / 5차 발표 대비

### 변경 1: 모바일 앱 스타일 UI 전면 개편

**레이아웃 변경** (`frontend/index.html`)
- `max-width: 430px` 앱 셸 — 데스크탑·모바일 모두 폰 화면처럼 표시
- 상단 탭 제거 → **하단 고정 네비게이션 바** (아이콘 + 라벨: 강의 등록 / 노트 생성 / 노트 조회)
- 상단 앱바: 아이콘 + LectureNote 로고 + 현재 탭명
- 카드 `border-radius: 16px`, 버튼 `min-height: 44px` (터치 타겟)
- 배경 #f5f5f7 (iOS 앱 느낌)

### 변경 2: 완료 알림 시스템

- **브라우저 알림 (Web Notifications API)**: 페이지 로드 시 권한 요청, 강의 등록/노트 생성 완료·오류 시 알림 발송
- **앱 내 토스트**: `position: fixed`, 3초 후 fade-out, ok/err/info 3가지 색상
- **로딩 개선**: 경과 시간 타이머, 10초마다 단계 메시지 자동 순환 (STT→분석→작성→마무리)

### 변경 3: LLM 프롬프트 수정 (`project_plan/make_note.md`)

- **문제**: 프롬프트가 멀티턴 대화용으로 설계되어 단일 API 호출 시 "준비 완료. STEP 1 입력해주세요." 등 확인 멘트를 노트 본문 앞에 출력
- **수정**: Section 4 "단계별 입력 절차" 삭제, 마지막 "준비 메시지" 지시 삭제
- **추가**: "확인 메시지 없이 [Overview] 섹션부터 바로 시작하라" 명시

### 변경 4: 모바일 텍스트 밀림 수정 (`frontend/index.html`)

- `.note-view` `max-height` 제거 → 이중 스크롤 없애고 페이지 자체 스크롤
- `word-break: keep-all` — 한국어 어절 단위 줄바꿈
- `overflow-wrap: break-word` — 긴 영단어/URL 줄바꿈
- `table { display: block; overflow-x: auto }` — 열 많은 표는 가로 스크롤
- `-webkit-overflow-scrolling: touch` — iOS 터치 스크롤

### 변경 5: 주차 번호 입력 기능

- Tab 2에 "몇 주차 수업인가요?" 숫자 입력 필드 추가
- `generate-note` API에 `week` 파라미터 전달 → `Output.week`에 저장
- Tab 3 노트 목록에서 저장된 주차 번호로 표시 (미입력 시 순서 기반 fallback)

### 변경 6: 노트 삭제 기능

- `DELETE /api/notes/{output_id}` 엔드포인트 추가 (`main.py`)
- Tab 3 노트 목록 각 항목에 삭제 버튼 추가

### 변경 7: 완료 후 탭 자동 연결 버튼

- 강의 등록 완료 결과 카드: "✏️ 노트 생성하기 →" 버튼 → Tab 2 이동
- 노트 생성 완료 결과 카드: "📚 노트 조회 →" 버튼 → Tab 3 이동

### 변경 8: 노트 인라인 편집 기능

- `PATCH /api/notes/{output_id}` 엔드포인트 추가 (Pydantic `NoteUpdate` 모델)
- Tab 3 노트 뷰어에 "✏️ 편집" 버튼 추가
- 클릭 시 textarea로 전환, "저장"/"취소" 버튼
- 저장 시 서버 PATCH 후 마크다운 재렌더링

### 변경 9: LLM 스트리밍 응답 (핵심 UX 개선)

**문제**: 노트 생성 시 1~2분 동안 화면이 멈춘 것처럼 보임

**해결 방법**:
- `llm_service.py`: `generate_lecture_note_stream()` 추가 — `generate_content_stream()` 사용
- `main.py`: `generate_note` 엔드포인트를 `StreamingResponse` (SSE) 로 변경
  - STT·PDF 처리(블로킹) → Sources DB 저장 → LLM 스트리밍 시작
  - SSE 이벤트: `{'t': 'c', 'v': chunk}` (청크), `{'t': 'd', 'id': ...}` (완료), `{'t': 'err', 'msg': ...}` (오류)
  - 스트리밍 완료 후 별도 `SessionLocal()`로 Output 저장
- `frontend/index.html`: `doGenNote()` 스트리밍 fetch로 전환
  - 첫 청크 도착 시 로딩 오버레이 숨김 → 결과 카드 표시
  - 스트리밍 중: `pre-wrap` 텍스트로 실시간 표시
  - 완료 이벤트 수신 시: 마크다운 렌더링 전환, 토스트·브라우저 알림 발송

---

---

## 8단계: STT 성능 최적화 (2026-05-15)

### 문제
STT (Gemini Audio API) 처리 시간이 ~53초로 너무 길다는 피드백.

### 원인 분석
1. Gemini 2.5-flash의 기본 설정은 Extended Thinking 활성화 — 단순 STT 작업에 불필요한 추론 토큰 소모
2. PDF 파싱과 STT가 순차 처리 — 첫 번째가 끝난 뒤 두 번째 시작

### 해결 1: `thinking_budget=0`

`stt_service.py`의 STT 호출과 `llm_service.py`의 `extract_lecture_meta`에 thinking 비활성화 추가:
```python
config=types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(thinking_budget=0),
)
```
단순 변환/추출 작업에 Extended Thinking은 응답 시간만 늘릴 뿐 품질 향상이 없다.

### 해결 2: `asyncio.gather` 병렬 처리

`generate-note` 엔드포인트에서 PDF 파싱과 STT를 병렬 실행:
```python
pdf_text, stt_text = await asyncio.gather(_run_pdf(), _run_stt())
```
`run_in_executor`로 블로킹 I/O를 비동기 컨텍스트에서 처리. 두 작업 중 더 오래 걸리는 것의 시간이 전체 대기 시간이 됨 (순차 합산 대비 단축).

---

## 9단계: 스트리밍 자동 스크롤 (2026-05-15)

### 구현

`app.js`에 scroll 이벤트 기반 자동 스크롤 추가:
- 첫 청크 도착 시 `streamAutoScroll = true`로 설정
- 각 청크마다 `content.scrollTop = content.scrollHeight` 실행
- `scroll` 이벤트 리스너: 현재 스크롤 위치가 하단에서 60px 이상 멀어지면 `streamAutoScroll = false` → 수동 스크롤로 전환

---

## 10단계: 사용자 인증 시스템 (2026-05-15)

### 목표
최초 화면에서 로그인, 자동 로그인 체크박스, 사용자별 데이터 격리. 알파/베타 수준이므로 SHA256+salt 방식으로 구현.

### DB 스키마 추가 (`models.py`)

```python
class User(Base):
    id, username, password_hash, salt
    email, display_name, school, major, plan, locale  # 추가 필드
    created_at

class Session(Base):
    id, user_id (FK), token, created_at, expires_at

class Lecture(Base):
    user_id (FK, nullable)  # 기존 데이터 호환
```

### 인증 모듈 (`src/auth.py`)

- `hash_password(password, salt)` — SHA256 단방향 해시
- `verify_password(password, salt, stored_hash)` — 검증
- `create_session(user_id, db)` — 72h TTL 토큰 생성
- `get_current_user(authorization, db)` — `Authorization: Bearer <token>` 헤더 검증, FastAPI Dependency로 사용

### 신규 API 엔드포인트

| 엔드포인트 | 설명 |
|---|---|
| POST /api/auth/register | 회원가입 (프로필 정보 포함) |
| POST /api/auth/login | 로그인 → `{"token": ..., "user": {...}}` |
| POST /api/auth/logout | 세션 토큰 삭제 |
| GET /api/auth/me | 현재 사용자 전체 정보 |
| PATCH /api/auth/me | 프로필 수정 |
| PATCH /api/auth/password | 비밀번호 변경 (전체 세션 무효화) |
| DELETE /api/auth/me | 계정 및 모든 데이터 삭제 |
| GET /api/auth/stats | 강의·노트 개수 통계 |

### 인라인 마이그레이션

서버 시작 시 기존 DB에 누락 컬럼 자동 추가 (SQLite `ALTER TABLE`). 컬럼이 이미 존재하면 예외 무시:
```python
@app.on_event("startup")
async def startup_migrate():
    migrations = [
        "ALTER TABLE lectures ADD COLUMN user_id ...",
        "ALTER TABLE users ADD COLUMN email TEXT",
        ...
    ]
```

### 프론트엔드 인증 흐름 (`app.js`)

- `authFetch(url, opts)` — 모든 API 호출에 `Authorization: Bearer <token>` 자동 첨부, 401 수신 시 토큰 삭제 후 온보딩 화면으로 이동
- `loadToken()` / `saveToken(token, persist)` — `localStorage` (자동 로그인) 또는 `sessionStorage` (일반 로그인)
- 앱 초기화 시 저장된 토큰으로 `/api/auth/me` 호출 → 유효 시 앱 직접 진입, 무효 시 온보딩 화면

### 다운로드 엔드포인트 토큰 처리

`GET /api/download-note/{id}`는 `window.open()`으로 URL을 열기 때문에 `Authorization` 헤더를 보낼 수 없다. `?token=<token>` 쿼리 파라미터로도 인증을 수락하도록 백엔드 수정:
```python
def download_note(output_id: int, token: Optional[str] = None, ...):
    raw_token = token or (authorization.split(" ", 1)[1] if ...)
```

---

## 11단계: UI 대규모 개편 — Auth + Profile + Pipeline A (2026-05-15)

### 디자인 기준

Claude 디자인으로 작성된 JSX 프로토타입 파일(`update/` → `docs/design/`에 보관)을 참고해 Vanilla JS로 구현. 선택 디자인:
- **Onboarding A**: 네이비 풀스크린, 로고 + 설명 + 버튼 2개
- **Login A**: 네이비 상단 + 화이트 카드 + 자동 로그인 체크박스
- **Signup B**: 2단계 프로그레스 도트
- **Profile B**: 그라디언트 헤더 + 통계 + 메뉴 행
- **Pipeline A**: 스텝 연결선 + 서브텍스트 + 경과 카운터

### 신규 아이콘 (`public/assets/icons.svg`)

17개 아이콘 추가: `i-chevron`, `i-eye`, `i-eye-off`, `i-mail`, `i-lock`, `i-user`, `i-at`, `i-school`, `i-moon`, `i-bell`, `i-globe`, `i-crown`, `i-logout`, `i-user-del`, `i-info`, `i-sparkles`, `i-shield`

### 신규 CSS 섹션 (`public/assets/styles.css`)

- **Auth root / Onboarding A** — 풀스크린 auth 컨테이너, 온보딩 버튼
- **Login A** — 네이비 헤더 + 화이트 카드, 아이콘 인풋, 비밀번호 토글
- **Signup B** — 프로그레스 도트 (pending / active / done 상태)
- **Profile B** — 그라디언트 헤더, 아바타, 통계 행, 프로필 메뉴 행
- **Pipeline A** — `.pipeline-step-wrap::after` 연결선, 단계별 서브텍스트, 카운터
- **Delete modal** — 하단 슬라이드 업 모달

### HTML 구조 (`public/index.html`)

```
#auth-root          ← 인증 스크린 컨테이너 (position: fixed z-index 900)
  #screen-onboarding
  #screen-login
  #screen-signup
#profile-screen     ← 프로필 풀스크린 (position: fixed z-index 850)
  #edit-profile-screen
  #change-pw-screen
.del-modal-mask     ← 계정 삭제 모달
#app               ← 메인 앱 (기본 display:none, 로그인 후 표시)
  .appbar
  .content (tab-t0 / tab-tn / tab-th)
  .bottom-nav
#loading (Pipeline A 로딩 오버레이)
```

### 앱 초기화 흐름 개선

1. 저장된 토큰 확인 → `/api/auth/me` 호출 (최대 2.5s 스플래시 유지)
2. 유효: 스플래시 즉시 종료 → `#app` 표시
3. 무효/없음: 스플래시 종료 → `#auth-root` 표시 (온보딩)

---

## 12단계: 베타 기능 완성 — Gen-banner·아이디찾기·프로필 확장 (2026-05-15)

### 목표

`docs/design/README_AUTH.md`에 설계된 나머지 기능을 전부 구현. 이전 단계(11단계)까지 반영되지 않은 항목 일괄 완성.

### 구현 1: 백그라운드 노트 생성 + Gen-banner

**문제**: 노트 생성 중 로딩 오버레이가 전체 화면을 덮어 다른 탭으로 이동 불가.

**해결**: `showLoad()`/`hideLoad()` 방식 → 상단 고정 gen-banner 방식으로 교체.

- SSE 루프는 원래 논블로킹이었으나 오버레이가 UX를 차단하고 있었음
- `gen-banner`: 진행 중 펄스 애니메이션·경과 시간 카운터·현재 파이프라인 단계 표시
- 완료 시 `.done` 클래스 + "보기 →" 버튼 → 해당 노트로 즉시 이동
- 오류 시 `.error` 클래스 전환
- 사용자는 생성 중에도 다른 탭을 자유롭게 탐색 가능

```js
showGenBanner('음성 처리 중', '음성을 텍스트로 변환하고 있습니다.');
// SSE 진행 중 updateGenBanner() 호출로 단계 표시 갱신
// 완료: completeGenBanner() → "보기 →" 버튼 표시
```

### 구현 2: 아이디 찾기 / 비밀번호 찾기

- `#screen-find`: 로그인 화면의 "아이디·비밀번호 찾기" 링크로 진입하는 별도 화면
- 탭 방식으로 "아이디 찾기" / "비밀번호 찾기" 전환 (`switchFindTab`)
- `POST /api/auth/find-id`: `display_name` + 선택적 `school` → 매칭되는 `username` 반환
- `POST /api/auth/find-pw`: `username` → 가입 이메일 앞 3자리 + `***`로 마스킹된 전송 메시지 반환 (데모용, 실제 이메일 발송 미구현)
- 성공 시 `.auth-err-banner.ok` (녹색), 실패 시 기본 빨간 배너

### 구현 3: 회원가입 강화

**이메일 필드**
- Step 1에 선택 입력 `email` 필드 추가
- `POST /api/auth/register` 요청 바디에 포함
- 비밀번호 찾기 기능의 연락처로 사용

**비밀번호 강도 게이지**
- 8자 이상 / 영문 포함 / 숫자 포함 / 특수문자 포함 → 0~4점 환산
- 막대 너비 + 색상(red → orange → yellow → green → #1A2D5E)으로 시각화
- `calcPwStrength()` / `updatePwStrength()` — 회원가입·비밀번호 변경 화면 공용

**이용약관 동의 (Step 2)**
- [필수] 이용약관, [필수] 개인정보처리방침, [선택] 마케팅 수신 체크박스
- "전체 동의" 마스터 체크박스 (`toggleAllTerms`)
- 필수 2개 미체크 시 "가입하고 시작하기" 버튼 비활성화 유지 (`checkTermsReq`)

### 구현 4: 프로필 화면 확장

**가입 정보 화면** (`#account-info-screen`)
- 아이디, 이메일, 학교, 전공, 가입일, 계획서 분석 건수 조회

**구독 플랜 화면** (`#plan-screen`)
- Free / Pro / Team 3개 플랜 카드 비교 (인기 배지, 가격, 기능 목록)
- 현재 플랜 강조 표시, Pro/Team 선택 시 "준비 중" 토스트

**언어 설정 화면** (`#language-screen`)
- 한국어 / English / 日本語 / 中文(简体) 선택
- `PATCH /api/auth/me` → `locale` 필드 업데이트
- `renderProfileHeader()`가 즉시 반영

**이번 주 통계**
- 프로필 헤더 통계에 "이번 주" 항목 추가
- `GET /api/auth/stats` → `notes_this_week` (7일 이내 생성 노트 수)

### 구현 5: 계정 삭제 확인 입력

- 기존: 버튼 클릭만으로 삭제 가능
- 변경: "탈퇴합니다" 문자열 직접 입력 후 버튼 활성화 (`checkDelConfirm`)

### 구현 6: Render 배포 + API URL

- Railway 무료 한도 소진 → Render 무료 플랜으로 전환
- `render.yaml` 생성 (서비스 타입, 빌드/시작 커맨드, `GEMINI_API_KEY` 환경변수 선언)
- 배포 URL: `https://lecture-note-2cb6.onrender.com`
- `app.js` `DEFAULT_PROD_API` 업데이트
- Render 무료 플랜 특성: 15분 미사용 시 슬립 → 최초 요청 약 30초 콜드 스타트

### 버그 수정

- `resetSignupForm()`: `reg-pw-strength-label` div의 텍스트가 초기화되지 않던 문제 → 두 요소 각각 처리
- `resetFindForm()`: find 화면 재진입 시 탭이 기본값(아이디 찾기)으로 리셋되지 않던 문제 → `switchFindTab('id')` 호출 추가

---

## 최종 환경 설정

### 설치 패키지
```
fastapi
uvicorn
python-multipart
sqlalchemy
pymupdf
google-genai
python-dotenv
requests
markdown
```

### `.env` 필수 항목
```
GEMINI_API_KEY=...
```

---

## 최종 파일 상태

| 파일 | 상태 |
|------|------|
| `src/main.py` | 완료 (엔드포인트 19개, 인증, CORS, SSE 스트리밍, 병렬 처리) |
| `src/auth.py` | 완료 (hash, verify, session, get_current_user) |
| `src/database.py` | 완료 |
| `src/models.py` | 완료 (User, Session, Lecture, Source, Output) |
| `src/services/__init__.py` | 완료 |
| `src/services/pdf_parser.py` | 완료 |
| `src/services/aggregator.py` | 완료 |
| `src/services/llm_service.py` | 완료 (스트리밍, thinking_budget=0) |
| `src/services/stt_service.py` | 완료 (thinking_budget=0) |
| `public/index.html` | 완료 (Auth+Profile+Pipeline A 전면 개편) |
| `public/assets/app.js` | 완료 (authFetch, auth/profile 핸들러, Pipeline A) |
| `public/assets/styles.css` | 완료 (Auth/Profile/Pipeline CSS 추가) |
| `public/assets/icons.svg` | 완료 (17개 신규 아이콘 추가) |
| `docs/planning/make_note.md` | 완료 (단일 호출용으로 수정) |

---

## API 엔드포인트 요약 (19개)

**Auth**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 내 정보 |
| PATCH | `/api/auth/me` | 프로필 수정 |
| PATCH | `/api/auth/password` | 비밀번호 변경 |
| DELETE | `/api/auth/me` | 계정 삭제 |
| GET | `/api/auth/stats` | 통계 (이번 주 포함) |
| POST | `/api/auth/find-id` | 아이디 찾기 (이름·학교로 조회) |
| POST | `/api/auth/find-pw` | 비밀번호 찾기 (등록 이메일로 안내) |

**Core**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | `/api/lectures` | 강의 목록 (사용자별) |
| DELETE | `/api/lectures/{id}` | 강의 삭제 (cascade) |
| POST   | `/api/create-step0` | 강의계획서 → Step 0 분석 |
| POST   | `/api/generate-note` | PDF + 음성 + 필기 → SSE 스트리밍 노트 생성 |
| GET    | `/api/lectures/{id}/notes` | 노트 목록 |
| GET    | `/api/notes/{id}` | 노트 내용 |
| PATCH  | `/api/notes/{id}` | 노트 수정 |
| DELETE | `/api/notes/{id}` | 노트 삭제 |
| GET    | `/api/download-note/{id}` | HTML 다운로드 (`?token=` 지원) |

---

## 서버 실행 방법
```bash
uvicorn main:app --reload
# frontend/index.html 을 브라우저에서 직접 열기
# Swagger UI: http://localhost:8000/docs
```

### 사용 흐름
1. `uvicorn main:app --reload` 서버 실행
2. `frontend/index.html` 파일을 브라우저에서 열기
3. **① 강의 등록**: 강의계획서 PDF 업로드 → 자동 분석 → 완료 시 "노트 생성하기 →" 클릭
4. **② 노트 생성**: 강의 선택 → 녹음(인앱 or 파일) + PDF + 필기 → 주차 입력 → 생성 (실시간 스트리밍)
5. **③ 노트 조회**: 강의 선택 → 노트 선택 → 열람·편집·다운로드
