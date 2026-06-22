# Project Structure

> 최종 업데이트: 2026-06-22

```
lecture_note_project/
│
├── README.md                        ← 포트폴리오 진입점 (architecture case study)
├── CLAUDE.md                        ← Claude Code 작업 지침
├── requirements.txt                 ← Python 의존성 (고정 버전)
├── Procfile                         ← Railway/Render 실행 명령
├── render.yaml                      ← Render 배포 설정
├── launch.bat                       ← 로컬 개발 서버 실행
├── replacements.txt                 ← Claude Code 훅 설정
├── .gitignore
│
├── src/                             ← 서버 코드 (uvicorn --app-dir src)
│   ├── main.py                      ← FastAPI 앱 + 모든 API 라우터 (19개 엔드포인트)
│   ├── database.py                  ← SQLAlchemy 엔진·세션, data/ 디렉토리 자동 생성
│   ├── models.py                    ← ORM 모델 (User, Session, Lecture, Source, Output)
│   ├── auth.py                      ← 세션 토큰 인증, 비밀번호 해시
│   ├── prompts/                     ← LLM system prompt (런타임 의존성 — 삭제 금지)
│   │   ├── syllabus_analysis.md     ← Step 0: 강의계획서 분석 프롬프트
│   │   └── make_note.md             ← Phase 2: 멀티소스 노트 생성 프롬프트
│   └── services/
│       ├── __init__.py
│       ├── aggregator.py            ← 멀티소스 typed context block 조립
│       ├── llm_service.py           ← Gemini API (analyze_syllabus, generate_note_stream)
│       ├── pdf_parser.py            ← PyMuPDF → markdown 변환
│       └── stt_service.py           ← Gemini Audio API → 텍스트
│
├── public/                          ← 프론트엔드 (FastAPI StaticFiles 서빙)
│   ├── index.html                   ← 멀티스크린 Vanilla SPA
│   ├── manifest.json                ← PWA 매니페스트
│   ├── assets/
│   │   ├── app.js                   ← 전체 클라이언트 로직
│   │   ├── styles.css
│   │   └── icons.svg
│   └── icons/                       ← PWA 아이콘
│
├── data/
│   └── .gitkeep                     ← 디렉토리 git 추적용 (lecture.db는 .gitignore)
│
└── docs/
    ├── STRUCTURE.md                 ← 이 파일
    ├── plan.md                      ← Railway 배포 설정, 환경변수, 배포 순서
    ├── growth.md                    ← 요금제 설계, B2C→B2B 확장 전략
    ├── history.md                   ← 단계별 구현 이력, 트러블슈팅
    ├── architecture/
    │   ├── step0-design.md          ← Step 0 설계 상세, RAG 패턴 비교
    │   ├── aggregator.md            ← Typed context block 구조
    │   └── sse-protocol.md          ← SSE 이벤트 프로토콜
    ├── api/
    │   └── reference.md             ← 전체 API 엔드포인트 (19개)
    ├── deployment/
    │   └── constraints.md           ← 운영 제약 및 개선 계획
    └── archive/                     ← 학기 중 작업물 (서버 구동과 무관)
        ├── roadmap-phase1.md
        ├── design.md
        ├── presentation.md
        ├── 렉쳐노트 피드백.txt
        ├── scripts/                 ← 발표 PPTX 생성 스크립트
        ├── planning/                ← 기획 단계 문서
        ├── design/                  ← UI 프로토타입 (JSX 디자인 시안)
        ├── outputs/                 ← 샘플 노트 출력물
        └── presentations/           ← 1~7차 발표 자료
```

---

## 서버 런타임 경로 의존성

| 파일 | 참조 위치 | 비고 |
|---|---|---|
| `src/prompts/syllabus_analysis.md` | `src/services/llm_service.py` | Step 0 system prompt |
| `src/prompts/make_note.md` | `src/services/llm_service.py` | 노트 생성 system prompt |
| `public/` | `src/main.py` StaticFiles mount | 프론트엔드 서빙 |
| `data/` | `src/database.py` SQLite 경로 | DB 디렉토리 (database.py가 자동 생성) |

`uvicorn --app-dir src`는 `sys.path`에 `src/`를 추가할 뿐, working directory는 프로젝트 루트 유지.  
모든 경로는 프로젝트 루트 기준 상대경로다.

---

## 로컬 실행

```bash
# 루트에서
launch.bat

# 또는
uvicorn main:app --reload --app-dir src
```
