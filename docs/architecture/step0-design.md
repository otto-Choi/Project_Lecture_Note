# Step 0 — Domain Context Build

> 이 문서는 LectureNote 파이프라인의 핵심 설계인 Phase 1(Step 0)을 상세히 설명한다.

---

## 설계 동기

일반적인 LLM 기반 문서 처리는 stateless다. 각 요청은 독립적으로 처리되며, 도메인 구조(커리큘럼 순서, 표준 용어, 평가 방향)에 대한 인식 없이 표면적 요약을 생성한다.

Step 0는 이 문제를 해결하기 위해 **생성 이전에 도메인 구조를 선행 추출하고 영속 저장**하는 단계를 파이프라인 앞에 배치한다. 이후 모든 노트 생성 요청은 이 컨텍스트를 주입받아 동작한다.

---

## 처리 흐름

```
Syllabus PDF
    │
    ▼
PyMuPDF → plain text 추출
    │
    ▼
LLM (analyze_syllabus)
  system prompt: syllabus_analysis.md
    │
    ▼
구조화 컨텍스트 추출:
  - 주차별 커리큘럼 맵
  - 표준 용어 사전 (STT 오인식 교정 기준)
  - 강의 전략 / 강조점
  - 시험 범위 테마 맵
    │
    ▼
DB 저장 (lectures 테이블, step0_context 컬럼)
    │
    ▼ (이후 모든 generate-note 요청에 자동 주입)
```

---

## 추출 항목

| 항목 | 용도 |
|---|---|
| 주차별 커리큘럼 | 노트의 [Overview] 섹션 — "이번 주차가 전체 흐름의 어느 단계인가" |
| 표준 용어 사전 | STT 오인식 교정 기준; 용어 일관성 보장 |
| 강의 전략 / 교수법 | 중요도(★) 판정 가중치 설정 |
| 시험 범위 테마 맵 | Self-Exam QA 생성 시 출제 근거 |

---

## Simplified RAG 패턴과의 유사성

| | 전통적 RAG | Step 0 패턴 |
|---|---|---|
| 컨텍스트 소스 | 외부 문서 벡터 DB | 사전 분석된 도메인 구조 (DB) |
| 검색(Retrieval) | 쿼리 유사도 기반 동적 검색 | 없음 — 전체 컨텍스트 정적 주입 |
| 업데이트 | 문서 추가 시 재인덱싱 | Syllabus 교체 시 Step 0 재실행 |
| 적합한 케이스 | 대규모 문서 코퍼스 | 단일 도메인 구조가 명확한 경우 |

Step 0는 retrieval 없이 **pre-built context를 전체 주입**하는 방식으로, 소규모·단일 도메인에서 RAG보다 단순하고 예측 가능한 결과를 낸다.

---

## 구현 위치

- 프롬프트: `docs/planning/syllabus_analysis.md`
- 서비스 함수: `src/services/llm_service.py` → `analyze_syllabus()`
- API 엔드포인트: `POST /api/create-step0`
- DB 컬럼: `lectures.step0_analysis` (TEXT)
- 주입 지점: `src/services/aggregator.py` → `[STEP 1: Step 0 강의 로드맵 분석 결과]` 블록

---

## 도메인 교체 가능성

Step 0의 입력(syllabus)과 system prompt만 교체하면 동일 파이프라인이 다른 도메인에 적용된다.

| 도메인 | Step 0 입력 | system prompt 변경 내용 |
|---|---|---|
| 감사·실사 | 감사 체크리스트 PDF | 리스크 항목·증거 기준 추출 |
| 컨설팅 | 과제 정의서 | 핵심 가설·분석 프레임 추출 |
| 법무 | 계약 조건 문서 | 의무 조항·기한·위험 플래그 추출 |
