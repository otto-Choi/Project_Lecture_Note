# LectureNote — 비정형 멀티모달 데이터 처리 파이프라인

> 경영전략 조별 프로젝트 | 2026학년도 1학기  
> FastAPI + Gemini 2.5-flash 기반 AI 워크플로우 시스템

---

## 1. 문제 정의

지식 집약적 업무에서 발생하는 정보 처리 병목은 대부분 **비정형 데이터의 파편화**에서 시작된다. 강의, 회의, 인터뷰, 감사 현장에서는 음성·문서·필기라는 서로 다른 형태의 정보가 동시에 생성되지만, 이를 통합·구조화하는 워크플로우는 존재하지 않는다.

결과적으로:
- 정보 재구성에 수작업 리소스가 과다 투입된다.
- 원본 맥락(커리큘럼 구조, 회의 아젠다 등)이 단편 처리 과정에서 소실된다.
- 생성된 결과물의 재사용성이 낮아 지식 자산으로 축적되지 못한다.

---

## 2. 워크플로우 비효율

| 기존 방식 | 병목 지점 |
|---|---|
| 녹음 → 수작업 받아쓰기 | 비선형 처리, 오탈자, 맥락 손실 |
| 슬라이드 PDF 별도 정리 | 음성 내용과 분리된 단편 자료 |
| 강의계획서·의제 별도 참고 | 구조적 맥락이 노트에 반영되지 않음 |
| 출처별 개별 정리 후 수동 병합 | 통합 비용이 생성 비용을 초과 |

이 시스템은 위 병목을 하나의 파이프라인으로 대체한다.

---

## 3. 시스템 아키텍처

```
[Ingestion Layer]              [Processing Layer]              [Output Layer]
────────────────────           ────────────────────────────    ──────────────────
Audio (.m4a / .mp3)  ──→      STT (Gemini Audio API)    ──→
PDF Slides           ──→      PDF Parsing (PyMuPDF)      ──→   Source Aggregator
Handwritten Text     ──→      Text Normalization         ──→   ──→ LLM Orchestration
                                                                     (Gemini 2.5-flash)
[Context Layer]                                                      ──→ Structured Note
Syllabus PDF         ──→      Curriculum Analysis        ──→   Context Injection
                               (Step 0)                         ──→ Self-Exam QA
```

**핵심 설계 원칙**: 강의계획서를 Step 0으로 분석해 얻은 커리큘럼 구조를 매 처리 요청에 컨텍스트로 주입한다. 이는 단순 요약 프롬프트와 달리 **도메인 구조를 인식한 생성(context-conditioned generation)** 을 가능하게 하며, RAG(Retrieval-Augmented Generation)의 simplified version과 동일한 설계 원리를 따른다.

---

## 4. AI 파이프라인 설계

### 4-1. 멀티소스 인제스천

`services/aggregator.py`는 입력된 소스들을 STEP 태그 기반 구조로 병합한다. LLM에 전달되는 프롬프트는 단일 텍스트가 아닌, 소스 유형별로 명시된 구조화된 컨텍스트 블록이다.

### 4-2. SSE 스트리밍 응답

초기 구현에서 LLM 응답 대기 시간은 1~2분에 달해 UI가 무응답 상태처럼 동작했다. 이는 사용자 신뢰를 저해하는 구조적 UX 병목이다.

해결 방식: `StreamingResponse` + Server-Sent Events(SSE)로 전환. 첫 청크 도착 시 UI를 즉시 전환하고, 청크 단위로 실시간 렌더링한다.

```
SSE 이벤트 프로토콜:
  {'t': 'c', 'v': chunk}     — 콘텐츠 청크
  {'t': 'd', 'id': output_id} — 처리 완료 + 저장된 레코드 ID
  {'t': 'err', 'msg': ...}   — 오류 발생
```

### 4-3. 컨텍스트 주입 전략

Step 0 분석 결과(주차별 커리큘럼, 핵심 용어 사전, 교수법 방향성)는 DB에 저장되어 이후 모든 노트 생성 요청에 자동 주입된다. 동일 파이프라인이 회의 의제, 감사 체크리스트, 사내 온보딩 문서 등으로 교체 가능한 이유가 이 구조다.

---

## 5. 기술 결정 및 근거

| 결정 사항 | 선택 | 근거 |
|---|---|---|
| 백엔드 프레임워크 | FastAPI | 비동기 처리, SSE 지원, 자동 OpenAPI 문서화 — 운영 복잡도 대비 최적 |
| DB | SQLite | 검증 단계에서 인프라 의존성 최소화; 트래픽 증가 시 PostgreSQL 전환 용이 |
| LLM | Gemini 2.5-flash | STT·LLM을 단일 API 키로 처리 → 외부 의존성 통합 |
| STT | Gemini Audio API | CLOVA Speech 무료 한도 소진 후 전환; 별도 키 없이 기존 인프라 재활용 |
| PDF 다운로드 방식 | HTML 파일 제공 | 한국어 PDF 변환 라이브러리(weasyprint, xhtml2pdf)의 폰트·인코딩 한계; 브라우저 렌더링으로 우회 |
| 프론트엔드 | Vanilla SPA | 빌드 파이프라인 불필요, FastAPI StaticFiles로 단일 서버 배포 가능 |

---

## 6. 운영 제약 및 현재 상태

### API 엔드포인트 (19개)

**Auth**

| 메서드 | 경로 | 기능 |
|---|---|---|
| POST | `/api/auth/register` | 회원가입 (username, password, email, display_name, school, major) |
| POST | `/api/auth/login` | 로그인 → Bearer 토큰 반환 |
| POST | `/api/auth/logout` | 세션 토큰 무효화 |
| GET | `/api/auth/me` | 현재 사용자 정보 조회 |
| PATCH | `/api/auth/me` | 프로필 수정 (display_name, school, major, locale) |
| PATCH | `/api/auth/password` | 비밀번호 변경 (기존 세션 전체 무효화) |
| DELETE | `/api/auth/me` | 계정 및 모든 데이터 삭제 |
| GET | `/api/auth/stats` | 사용자 강의·노트 통계 (이번 주 포함) |
| POST | `/api/auth/find-id` | 아이디 찾기 (이름·학교로 조회) |
| POST | `/api/auth/find-pw` | 비밀번호 찾기 (등록 이메일로 안내) |

**Core Pipeline (사용자 인증 필수)**

| 메서드 | 경로 | 기능 |
|---|---|---|
| POST | `/api/create-step0` | 강의계획서 분석 → 커리큘럼 구조 추출 및 저장 |
| POST | `/api/generate-note` | 멀티소스 인제스천 → SSE 스트리밍 노트 생성 |
| GET | `/api/lectures` | 로그인 사용자의 강의 목록 |
| DELETE | `/api/lectures/{id}` | 강의 및 연관 레코드 삭제 (cascade) |
| GET | `/api/lectures/{id}/notes` | 특정 강의 하위 노트 목록 |
| GET | `/api/notes/{id}` | 구조화된 노트 조회 |
| PATCH | `/api/notes/{id}` | 노트 편집 |
| DELETE | `/api/notes/{id}` | 노트 삭제 |
| GET | `/api/download-note/{id}` | HTML 형식 출력물 다운로드 (token 쿼리 파라미터 지원) |

### 현재 운영 제약

- API 엔드포인트 일부 예외 처리 미적용 — Gemini quota 초과, 업로드 실패 시 비구조적 오류 반환
- SQLite 경로 미분리 — 컨테이너 재배포 시 데이터 소실 위험
- 비밀번호 SHA256 단방향 해시 (salt 포함) — alpha/beta 수준, bcrypt 전환 미적용
- Render 무료 플랜: 15분 비활성 시 슬립 → 최초 요청 약 30초 콜드 스타트
- 비밀번호 찾기: 실제 이메일 발송 미구현 (데모 메시지만 반환)

→ 상세 체크리스트는 [plan.md](plan.md) 참조.

---

## 7. 개발 로드맵

### Phase 1 — 학기 내 앱 완성 (진행 중)

팀 프로젝트 발표 일정에 맞춰 목표한 기능을 완성하는 것이 우선이다.

| 항목 | 내용 | 상태 |
|---|---|---|
| ✅ 파이프라인 스텝 인디케이터 | Pipeline A 디자인 — 연결선·서브텍스트·N/5 카운터 | 완료 |
| ✅ STT 성능 최적화 | `thinking_budget=0` + PDF·STT 병렬 처리 (`asyncio.gather`) | 완료 |
| ✅ 스트리밍 자동 스크롤 | 생성 중 하단 자동 스크롤 + 수동 조작 시 멈춤 | 완료 |
| ✅ 로그인·사용자 인증 | 온보딩·로그인·회원가입 화면, 세션 토큰, 사용자별 데이터 격리 | 완료 |
| ✅ 프로필 화면 | Profile B — 그라디언트 헤더, 통계, 프로필 편집, 비밀번호 변경, 계정 삭제 | 완료 |
| ✅ 백그라운드 노트 생성 | Gen-modal 팝업 → "백그라운드에서 진행" → 상단 배너, 배너 클릭 시 팝업 재표시 | 완료 |
| ✅ 아이디/비밀번호 찾기 | 이름·학교로 아이디 찾기, 등록 이메일로 비밀번호 안내 | 완료 |
| ✅ 구독 플랜·언어·가입 정보 화면 | 프로필 확장 — 플랜 비교, 언어 설정, 계정 상세 조회 | 완료 |
| ✅ 회원가입 강화 | 이메일 필드, 비밀번호 강도 게이지, 이용약관 동의 | 완료 |
| ✅ Render 배포 | `render.yaml` + GitHub 자동 배포 | 완료 |
| ✅ 다크모드 대비 개선 | 입력·카드·노트뷰 배경 변수화, 헤딩 텍스트 색상 오버라이드 | 완료 |
| ✅ 노트 내 키워드 검색 | 하이라이트 + 매치 수 표시 + ↑↓ 이동, Tab2·Tab3 모두 지원 | 완료 |
| PWA 매니페스트 | `manifest.json` 추가 → 모바일 홈 화면 설치 가능 | 대기 |
| 처리 메타데이터 표시 | 노트 완료 후 소스 구성·처리 시간 표시 | 대기 |
| 이미지 입력 지원 | Gemini Vision 기반 칠판 사진·필기 이미지 처리 | 향후 추가 |
| 다중 파일 업로드 | PDF·음성 파일 여러 개 동시 인제스천 | 향후 추가 |

### Phase 2 — 배포 및 포트폴리오 정리 (학기 종료 후)

학기 내 완성된 앱을 외부 접근 가능한 상태로 배포하고, 포트폴리오 아카이브로 정리한다.

- Render 배포 완료: `https://lecture-note-2cb6.onrender.com` (상세: [plan.md](plan.md))
- GitHub README 정비 및 아키텍처 다이어그램 추가
- 슬라이드 기능 카드 명칭 파이프라인 용어로 교체

### Phase 3 — 파이프라인 확장 (장기)

이 파이프라인의 핵심 가치는 강의 처리가 아니라 **이기종 비정형 입력을 구조화된 지식 산출물로 변환하는 아키텍처**다. 현재 구조는 아래 도메인에 동일하게 적용 가능하다.

| 도메인 | 입력 소스 | Step 0 컨텍스트 | 출력 |
|---|---|---|---|
| 감사·실사 | 인터뷰 녹음, 증빙 PDF | 감사 체크리스트 | 리스크 항목 정리 보고서 |
| 컨설팅 | 고객 인터뷰 녹취, 공시자료 | 과제 정의서 | 구조화된 분석 초안 |
| 기업 내부 | 사내 강의 녹음, 정책 문서 | 온보딩 가이드 | 부서별 지식 베이스 |
| 법무·컴플라이언스 | 회의록, 계약서 PDF | 규정·체크리스트 | 검토 요약 및 위험 플래그 |

---

## 관련 문서

| 문서 | 경로 | 내용 |
|---|---|---|
| 배포 플랜 | [plan.md](plan.md) | 배포 전 필수 수정, Railway 배포 순서, 포트폴리오 작업 목록 |
| 성장 전략 | [growth.md](growth.md) | 요금제 설계, B2C→B2B 확장 전략, 기술 로드맵, 경쟁 포지셔닝 |
| 개발 이력 | [history.md](history.md) | 단계별 구현 내용, 트러블슈팅 상세 기록 |
| 디렉토리 구조 | [STRUCTURE.md](STRUCTURE.md) | 재배치 목적·결과·현재 구조 트리 |
| 발표 자료 | [presentations/](presentations/) | 1~4차 PDF, PPTX, 대본, 스크린샷 |
| 기획 문서 | [planning/](planning/) | 백엔드 구현 가이드, 프롬프트 설계 |
