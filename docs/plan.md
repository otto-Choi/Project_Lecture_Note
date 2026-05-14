# LectureNote — 배포 및 포트폴리오 플랜

> 목표: 로컬 시연 → Railway 외부 배포 + GitHub 포트폴리오 아카이브  
> 업데이트: 2026-05-15

---

## 현재 스택

| 레이어 | 기술 | 비고 |
|---|---|---|
| 백엔드 | FastAPI + Python | 17개 API 엔드포인트, SSE 스트리밍 |
| DB | SQLite | `data/lecture.db` |
| AI | Gemini 2.5-flash | LLM 생성 + STT + 컨텍스트 분석 단일 API |
| 인증 | 세션 토큰 (Bearer) | SHA256+salt 해시, 72h TTL, localStorage 자동 로그인 |
| 프론트 | Vanilla HTML/CSS/JS | 멀티스크린 SPA (Auth / Main App / Profile) |
| 배포 | Railway | `https://web-production-94071.up.railway.app` |

이 구조는 현재 검증 단계에 맞게 의도적으로 경량화된 선택이다. Docker/K8s, PostgreSQL, React 빌드 파이프라인은 현재 운영 규모에서 불필요한 복잡도를 추가할 뿐이다. 트래픽 검증 이후 단계적 전환이 올바른 순서다.

---

## 배포 전 필수 수정

### 1. `index.html` — API URL 하드코딩 제거

```js
// 현재: 배포 환경에서 동작 불가
const API = 'http://localhost:8000';

// 수정 후: 같은 origin이면 상대경로로 동작
const API = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
```

FastAPI가 StaticFiles로 HTML을 직접 서브하면 API와 프론트가 동일 도메인 → 빈 문자열로 모든 fetch가 상대경로 처리됨.

---

### 2. `src/database.py` — DB 경로 환경변수화

```python
# 현재: 컨테이너 레이어에 저장 → 재배포 시 데이터 소실
DATABASE_URL = "sqlite:///./lecture.db"

# 수정 후: Persistent Volume 마운트 경로 사용
import os
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////data/lecture.db")
```

Railway에서 `/data`에 Persistent Volume을 마운트하면 재배포 후에도 데이터 유지.

---

### 3. `src/main.py` — StaticFiles 마운트 추가

```python
from fastapi.staticfiles import StaticFiles

# 모든 API 라우터 등록 이후 맨 마지막에 추가 (순서 중요)
app.mount("/", StaticFiles(directory=".", html=True), name="static")
```

API 라우터보다 나중에 선언해야 경로 충돌 없음.

---

### 4. `src/main.py` — 헬스체크 엔드포인트 추가

```python
@app.get("/health")
def health():
    return {"status": "ok"}
```

Railway 배포 완료 확인용. 발표 직전 서버 상태 점검에도 사용.

---

### 5. `requirements.txt` 생성

```
fastapi==0.115.12
uvicorn[standard]==0.34.3
python-multipart==0.0.20
sqlalchemy==2.0.49
google-genai==1.16.0
pymupdf==1.26.0
markdown==3.8
python-dotenv==1.1.0
```

배포 실패의 가장 흔한 원인. 로컬 환경 버전 기준으로 고정.

---

### 6. `.gitignore` 생성

```gitignore
.env
__pycache__/
*.pyc
data/lecture.db
```

`.env`에 GEMINI_API_KEY가 평문으로 존재. GitHub 푸시 전 반드시 제외. Railway에서는 대시보드 Variables 탭에서 직접 설정.

---

## 권장 수정 (배포 후 안정화)

### 7. 주요 엔드포인트 예외 처리

현재 `generate-note`, `create-step0` 등 핵심 엔드포인트에 예외 처리 없음. Gemini quota 초과, 파일 파싱 실패, 네트워크 timeout이 비구조적 500 오류로 반환된다.

```python
import logging
logger = logging.getLogger(__name__)

try:
    result = llm_service.analyze_syllabus(syllabus_text)
except Exception as e:
    logger.exception(e)
    raise HTTPException(status_code=500, detail=f"파이프라인 처리 실패: {str(e)}")
```

---

### 8. `Procfile` 생성 (Railway 실행 명령)

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT --app-dir src
```

---

## 앱 고도화 과제 (학기 내 완성 목표)

팀 프로젝트 마지막 주차까지 목표한 앱 개발을 완료하는 것이 우선이다. 아래는 우선순위 순서.

| 항목 | 내용 | 상태 |
|---|---|---|
| ✅ STT 성능 최적화 | `thinking_budget=0` + `asyncio.gather` 병렬 PDF·STT | 완료 |
| ✅ 스트리밍 자동 스크롤 | 생성 중 하단 자동 스크롤, 수동 스크롤 시 멈춤 | 완료 |
| ✅ 사용자 인증 시스템 | 로그인·회원가입·세션 토큰·사용자별 데이터 격리 | 완료 |
| ✅ 파이프라인 스텝 인디케이터 | Pipeline A — 연결선·서브텍스트·경과시간 카운터 | 완료 |
| ✅ 프로필 화면 | Profile B — 통계·편집·비밀번호 변경·계정 삭제 | 완료 |
| PWA 매니페스트 | `manifest.json` + 아이콘 추가 → 모바일 홈 화면 설치 | 대기 (1시간) |
| 처리 메타데이터 표시 | 노트 완료 후 소스 구성·처리 시간 표시 | 대기 (1시간) |
| 이미지 입력 지원 | Gemini Vision 기반 칠판 사진·필기 이미지 처리 | 대기 (3~4시간) |
| 노트 키워드 검색 | SQLite FTS 또는 프론트 필터링 | 대기 (2시간) |

---

## 배포 순서

```
1. 위 필수 수정 6개 적용
2. GitHub repo push (.env 제외 확인)
3. railway.app → New Project → Deploy from GitHub
4. Railway 대시보드: Variables → GEMINI_API_KEY 입력
5. Railway: Add Volume → Mount Path: /data
6. 배포 완료 후 /health 접속 확인
7. 발급된 URL로 외부 접속 테스트
8. (선택) manifest.json 추가 → PWA 설치 배너 확인
```

---

## 포트폴리오 포지셔닝

### 핵심 프레이밍

이 프로젝트는 강의 요약 도구가 아니다. **비정형 멀티모달 입력을 구조화된 지식 산출물로 변환하는 AI 워크플로우 파이프라인**이다. 강의 데이터는 그 파이프라인의 한 가지 적용 사례일 뿐이다.

코드는 이미 파이프라인 구조로 구현되어 있다. 부족한 것은 구현이 아니라 **그 구조를 정확하게 설명하는 언어**다.

### 포트폴리오 내 역할

- **Audit/회계 관련 프로젝트** → 업무 도메인 이해와 운영 시스템 감각을 증명
- **이 프로젝트** → AI 파이프라인 설계 및 구현 역량을 증명
- **두 프로젝트의 조합** → "AI를 실무 워크플로우에 통합할 수 있는 사람"으로 읽힘

### 발표/면접에서의 설명 방식

> "비정형 데이터가 여러 형태로 동시에 생성되는 환경에서 이를 통합 처리하는 워크플로우가 없다는 문제를 인식했습니다.
> 음성, PDF, 필기를 단일 파이프라인으로 수집·처리하고, 사전 분석된 구조적 컨텍스트를 매 생성 요청에 주입하는 방식으로 설계했습니다.
> 초기 단계에서는 운영 복잡도를 최소화하기 위해 SQLite와 단일 FastAPI 서버를 선택했고, 트래픽 검증 이후 PostgreSQL 전환 및 서비스 분리를 고려하는 단계적 접근입니다."

이 설명은 "몰라서 단순하게 만든 것"이 아니라 "현재 단계에 맞는 아키텍처 결정"으로 읽힌다.

---

### 포트폴리오용 작업 목록

#### P1. 슬라이드 기능 카드 명칭 교체 (10분)

| 현재 | 교체 후 |
|---|---|
| 모바일 앱 스타일 UI | Multi-source Ingestion Layer |
| 원클릭 강의 등록 | Context-Aware Curriculum Analysis (Step 0) |
| 실시간 스트리밍 노트 생성 | Streaming LLM Orchestration (SSE) |

#### P2. 아키텍처 다이어그램 슬라이드 추가 (1시간)

기술 스택 슬라이드 다음에 Ingestion → Processing → Output 흐름 다이어그램 한 장 추가. 면접관이 가장 먼저 찾는 슬라이드. 구현과 무관하게 "설계를 이해하는 사람"으로 포지셔닝된다.

#### P3. 파이프라인 스텝 인디케이터 UI (2~3시간)

```
  ① Audio Ingestion       ✓ 완료
  ② Speech-to-Text        ⟳ 처리 중...
  ③ Source Aggregation    ─
  ④ Context Injection     ─
  ⑤ Note Generation       ─
```

기존 STT 완료 → SSE 시작 로직에 상태 변수만 추가하면 된다. 스크린샷이 포트폴리오 첨부 자료로 즉시 활용 가능.

#### P4. 노트 완료 후 처리 메타데이터 표시 (1시간)

```
소스: 음성(23분) + 강의 슬라이드(18p) + 커리큘럼 컨텍스트
처리 시간: 34초  |  생성 섹션: 5개
```

백엔드에 이미 데이터가 있다. 프론트 렌더링만 추가하면 된다.

#### P5. GitHub README 재작성 (30분)

이미 이 디렉토리의 [README.md](README.md)에 초안 작성됨. 그대로 GitHub 루트 README로 이식 가능.

| 과제 | 공수 | 효과 |
|---|---|---|
| P1. 슬라이드 카드 명칭 교체 | 10분 | 기술 이해도 인상 |
| P2. 아키텍처 다이어그램 추가 | 1시간 | "설계자" 포지셔닝 — 가장 큰 효과 |
| P3. 파이프라인 인디케이터 UI | 2~3시간 | 서비스 완성도 + 스크린샷 자료 |
| P4. 처리 메타데이터 표시 | 1시간 | 기술적 디테일 어필 |
| P5. GitHub README | 30분 | GitHub 첫인상 결정 |
