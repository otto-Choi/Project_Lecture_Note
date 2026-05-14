# 디렉토리 구조 정리 기록

> 작성일: 2026-05-15

---

## 목적

| 목표 | 내용 |
|---|---|
| 실행 접근성 | 서버 실행(`launch.bat`)과 프론트(`index.html`)를 루트에 배치해 바로 열 수 있도록 |
| Git 아카이브 | 소스·데이터·문서를 분리해 `.gitignore` 적용 및 포트폴리오 제출 시 정리된 상태 유지 |
| 이력 보존 | 발표 자료(`_history/`, `_outputs/`)를 차수별로 분류해 `docs/presentations/` 안에 통합 |

---

## 변경 내역 (이전 → 이후)

| 이전 경로 | 이후 경로 | 비고 |
|---|---|---|
| `main.py`, `database.py`, `models.py`, `make_pptx_4th.py` | `src/` | Python 소스 통합 |
| `services/` | `src/services/` | 서비스 모듈 이동 |
| `frontend/index.html` | `index.html` (루트) | 테스트 접근성 |
| `lecture.db` | `data/lecture.db` | 데이터 분리 |
| `_example/` | `data/examples/` | 예제 입력 파일 |
| `_history/*.pdf`, `*.pptx` | `docs/presentations/{차수}/` | 차수별 분류 |
| `_history/*대본.txt` | `docs/presentations/{차수}/` | 발표 대본 동일 폴더 |
| `_outputs/{차수}/` (스크린샷) | `docs/presentations/{차수}/screenshots/` | 발표 자료와 통합 |
| `_outputs/lecture_note_2.html` | `docs/outputs/` | 생성 출력물 |
| `project_plan/` | `docs/planning/` | 기획 문서 |
| `history.md`, `plan.md`, `presentation.md` | `docs/` | 루트 문서 이동 |
| `백엔드 테스트.url` | `docs/` | 참고 링크 |
| `launch.bat` | `launch.bat` (루트 유지) | `--app-dir src` 옵션 추가 |
| `__pycache__/` | 삭제 | Python 재실행 시 자동 재생성 |

---

## 현재 디렉토리 구조

```
lecture_note_project/
├── .env                        # Gemini API Key 등 환경변수 (Git 제외 필수)
├── launch.bat                  # 서버 실행: uvicorn main:app --reload --app-dir src
├── index.html                  # 프론트엔드 SPA (테스트 시 브라우저로 직접 열기)
│
├── src/                        # Python 백엔드 소스
│   ├── main.py                 # FastAPI 앱 진입점, 9개 API 엔드포인트
│   ├── database.py             # SQLAlchemy 엔진 및 세션
│   ├── models.py               # ORM 모델 (Lecture, Note 등)
│   ├── make_pptx_4th.py        # 4차 발표 PPTX 생성 스크립트
│   └── services/
│       ├── aggregator.py       # 멀티소스 데이터 통합
│       ├── llm_service.py      # Gemini LLM 호출 (노트 생성, 복습문제)
│       ├── pdf_parser.py       # PyMuPDF 기반 슬라이드 파싱
│       └── stt_service.py      # Gemini Audio API 음성 변환
│
├── data/
│   ├── lecture.db              # SQLite DB (Git 제외 권장)
│   └── examples/               # 테스트용 샘플 입력 파일
│       ├── 조직행동론.pdf
│       ├── 조직행동론 w3.m4a
│       ├── Lecture Slides_Week 3_Motivation 2.pdf
│       └── w3.docx
│
├── package/                    # Android PWA 패키징 (Capacitor)
│   ├── capacitor.config.ts
│   ├── package.json
│   ├── www/                    # 빌드된 웹 에셋
│   ├── android-patches/
│   ├── android-resources/
│   ├── BUILD_GUIDE.md
│   └── README.md
│
└── docs/                       # 문서 및 발표 자료
    ├── STRUCTURE.md            # 이 파일
    ├── plan.md                 # 배포 플랜 및 포트폴리오 전략
    ├── design.md               # 설계 문서
    ├── history.md              # 개발 이력
    ├── presentation.md         # 발표 관련 메모
    ├── 백엔드 테스트.url
    │
    ├── presentations/          # 차수별 발표 자료 (PDF + PPTX + 대본 + 스크린샷)
    │   ├── 1차/
    │   │   ├── 렉쳐노트_1차 발표.pdf
    │   │   ├── 렉쳐노트_1차발표.pptx
    │   │   └── 1차발표_대본.txt
    │   ├── 2차/
    │   │   ├── 렉쳐노트_2차발표.pdf
    │   │   ├── 렉쳐노트_2차발표.pptx
    │   │   └── 2차발표_대본.txt
    │   ├── 3차/
    │   │   ├── 렉쳐노트_3차발표.pdf
    │   │   ├── 렉쳐노트_3차발표.pptx
    │   │   ├── 렉처노트_3차발표.md
    │   │   └── screenshots/    # 앱 시연 스크린샷 (1.png ~ 8.png)
    │   └── 4차/
    │       ├── 렉쳐노트_4차발표.pdf
    │       ├── 렉쳐노트_4차발표.pptx
    │       ├── 4차발표_대본.txt
    │       └── screenshots/    # 기능별 스크린샷 (01_강의계획서 등록 ~ 11_복습문제 예시)
    │
    ├── planning/               # 개발 기획 문서
    │   ├── 3차발표_대비_기획.md
    │   ├── make_note.md
    │   ├── syllabus_analysis.md
    │   ├── 백엔드_구현_가이드.md
    │   └── 코딩_요청.md
    │
    └── outputs/                # 앱이 생성한 출력 샘플
        └── lecture_note_2.html
```

---

## 실행 방법

```bash
# 서버 시작 (루트에서 실행)
launch.bat

# 또는 직접
uvicorn main:app --reload --app-dir src
```

서버 시작 후 `index.html`을 브라우저로 열거나, `http://localhost:8000`으로 접속.

---

## Git 아카이브 시 제외 권장 항목

```gitignore
.env
__pycache__/
*.pyc
data/lecture.db
```

`data/examples/`의 샘플 파일은 데모용으로 포함 여부를 선택적으로 결정.
