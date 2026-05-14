# LectureNote — AI 기반 강의 노트 자동 생성 서비스
### 경영전략 9팀 | 5차 발표 | 2026-05-07 | **알파 빌드 완료**

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
| **6단계** | **2026-05-06** | 프론트엔드 초기 구현 (3탭 SPA, 인앱 녹음, 강의 카드 목록) |
| **7단계** | **2026-05-07** | **알파 빌드 완료** — 모바일 앱 UI, 실시간 스트리밍, 노트 편집/삭제, 완료 알림 |

---

## 4. 현재 주요 기능 (5차 발표 기준)

### 4-1. 모바일 앱 스타일 UI
- 최대 너비 430px 앱 셸 — 스마트폰 화면처럼 표시
- 하단 고정 네비게이션 바 (강의 등록 / 노트 생성 / 노트 조회)
- 카드 기반 레이아웃, 터치 최적화 버튼 크기

### 4-2. 원클릭 강의 등록
- 강의계획서 PDF 업로드 → Gemini가 커리큘럼 전체 분석
- 과목명·교수명 자동 추출 및 저장 (입력 불필요)
- 결과: 주차별 학습 로드맵 (Step 0) 즉시 확인

### 4-3. 실시간 스트리밍 노트 생성
- 음성 녹음(인앱 or 파일) + PDF + 필기를 동시에 업로드
- STT 처리 완료 후 **노트가 타이핑되듯 실시간으로 표시** (SSE 스트리밍)
- "1분 기다려야 하나?" → 첫 문장이 나오는 순간부터 내용 확인 가능

### 4-4. 노트 관리 (조회·편집·삭제·다운로드)
- 등록된 강의별 주차 노트 목록 조회
- 인라인 편집 — 생성된 노트를 앱 내에서 직접 수정·저장
- 개별 노트 삭제
- HTML 파일 다운로드 → 브라우저에서 열고 Ctrl+P로 PDF 저장

### 4-5. 완료 알림
- 브라우저 알림 (탭 이탈 중에도 수신)
- 앱 내 토스트 메시지

---

## 5. 기술 스택

| 계층 | 기술 | 역할 |
|------|------|------|
| **AI** | Gemini 2.5-flash | LLM 노트 생성, STT 음성 변환, 메타데이터 추출 |
| **백엔드** | FastAPI + Python | REST API, SSE 스트리밍 |
| **DB** | SQLite + SQLAlchemy | 강의·노트·소스 저장 |
| **PDF 파싱** | PyMuPDF (fitz) | PDF → 텍스트 추출 |
| **프론트엔드** | Vanilla HTML/CSS/JS | 단일 파일 SPA (빌드 도구 없음) |
| **마크다운** | marked.js (CDN) | 생성 노트 렌더링 |
| **녹음** | MediaRecorder API | 브라우저 내 음성 녹음 |

---

## 6. 시스템 아키텍처

```
[브라우저 - index.html]
    │
    │ HTTP / SSE
    ▼
[FastAPI 서버 - main.py]
    ├── POST /api/create-step0   ──▶ pdf_parser ──▶ llm_service.analyze_syllabus()
    │                                              ──▶ llm_service.extract_lecture_meta()
    │
    ├── POST /api/generate-note  ──▶ pdf_parser
    │   (StreamingResponse SSE)  ──▶ stt_service.process_audio_to_text()
    │                            ──▶ aggregator.aggregate_sources()
    │                            ──▶ llm_service.generate_lecture_note_stream()
    │                                    │
    │                                    ▼ 청크 단위 SSE 전송
    │
    ├── PATCH /api/notes/{id}    ──▶ Output.summary 업데이트
    └── DELETE /api/notes/{id}   ──▶ Output 삭제
    
[SQLite - lecture.db]
    ├── lectures (id, title, subject, step0_analysis)
    ├── sources  (lecture_id, type, content)
    └── outputs  (lecture_id, week, summary)
```

---

## 7. API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | `/api/lectures` | 강의 목록 |
| DELETE | `/api/lectures/{id}` | 강의 삭제 |
| POST   | `/api/create-step0` | 강의계획서 분석 등록 |
| POST   | `/api/generate-note` | 노트 생성 (SSE 스트리밍) |
| GET    | `/api/lectures/{id}/notes` | 주차별 노트 목록 |
| GET    | `/api/notes/{id}` | 노트 내용 |
| PATCH  | `/api/notes/{id}` | 노트 편집 |
| DELETE | `/api/notes/{id}` | 노트 삭제 |
| GET    | `/api/download-note/{id}` | HTML 다운로드 |

---

## 8. 데모 시나리오

### 준비물
- 강의계획서 PDF
- 수업 자료 PDF (슬라이드 등)
- 음성 녹음 파일 (m4a/webm/mp3) — 또는 인앱 녹음

### 데모 순서

**Step 1 — 서버 실행**
```bash
uvicorn main:app --reload
```

**Step 2 — 브라우저에서 `frontend/index.html` 열기**

**Step 3 — ① 강의 등록 탭**
1. 강의계획서 PDF 드래그앤드롭
2. "강의 등록하기 →" 클릭
3. AI가 커리큘럼 분석 후 과목명·교수명 자동 표시
4. "✏️ 노트 생성하기 →" 클릭

**Step 4 — ② 노트 생성 탭**
1. 강의 카드 선택
2. 녹음 파일 업로드 or 인앱 녹음
3. 수업자료 PDF 업로드
4. 주차 번호 입력 (예: 4)
5. "노트 생성하기 →" 클릭
6. **실시간 스트리밍으로 노트가 작성되는 것을 확인**
7. 완료 시 브라우저 알림 수신

**Step 5 — ③ 노트 조회 탭**
1. 강의 선택 → 주차 노트 목록 확인
2. 노트 클릭 → 내용 열람
3. "✏️ 편집"으로 수정 → 저장
4. "⬇ 다운로드"로 HTML 저장

---

## 9. 핵심 차별점

| 항목 | 기존 방식 | LectureNote |
|------|-----------|-------------|
| 노트 작성 | 수강 중 직접 필기 | AI 자동 생성 |
| 정보 통합 | 파일별 따로 확인 | 4개 소스 통합 |
| 시험 대비 | 직접 핵심 추출 | [Self-Exam] 자동 제공 |
| 강의 맥락 | 매 주차 독립적 | Step 0 로드맵 연결 |
| 결과 확인 | 생성 완료 후 일괄 | **실시간 스트리밍** |

---

## 10. 향후 개발 계획

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| 높음 | 사진(이미지) 업로드 | 칠판 필기 사진 → Gemini 멀티모달 OCR |
| 높음 | 모바일 앱 패키징 | PWA 또는 Capacitor로 실제 앱 배포 |
| 중간 | 노트 검색 | 강의명/키워드로 노트 전문 검색 |
| 중간 | 다중 사용자 | 인증 추가, 팀 단위 노트 공유 |
| 낮음 | 노트 재생성 | 같은 주차 자료로 다른 관점 노트 생성 |

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
uvicorn main:app --reload
```
→ `frontend/index.html` 파일을 브라우저에서 열기

---

*LectureNote — 경영전략 9팀*
