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
| `main.py` | 완료 (엔드포인트 9개, CORS, SSE 스트리밍) |
| `database.py` | 완료 |
| `models.py` | 완료 (week 컬럼 추가) |
| `services/__init__.py` | 완료 |
| `services/pdf_parser.py` | 완료 |
| `services/aggregator.py` | 완료 |
| `services/llm_service.py` | 완료 (스트리밍 함수 추가) |
| `services/stt_service.py` | 완료 |
| `project_plan/make_note.md` | 완료 (단일 호출용으로 수정) |
| `frontend/index.html` | 완료 (모바일 앱 UI, 스트리밍, 편집/삭제) |

---

## API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | `/api/lectures` | 강의 목록 반환 |
| DELETE | `/api/lectures/{id}` | 강의 삭제 (노트·소스 cascade) |
| POST   | `/api/create-step0` | 강의계획서 → Step 0 분석, 과목명·교수명 자동 추출 |
| POST   | `/api/generate-note` | PDF + 음성 + 필기 → SSE 스트리밍 노트 생성 |
| GET    | `/api/lectures/{id}/notes` | 특정 강의의 노트 목록 |
| GET    | `/api/notes/{id}` | 노트 내용 반환 |
| PATCH  | `/api/notes/{id}` | 노트 내용 수정 |
| DELETE | `/api/notes/{id}` | 노트 삭제 |
| GET    | `/api/download-note/{id}` | 노트 HTML 파일 다운로드 |

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
