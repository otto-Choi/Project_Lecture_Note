# Multi-Source Aggregator

> `src/services/aggregator.py`

---

## 역할

여러 소스(Step 0 컨텍스트, PDF, 음성 스크립트, 필기)를 단일 LLM 프롬프트로 조립한다. LLM이 각 소스의 **역할과 우선순위**를 명확히 인식하도록 typed context block 구조를 사용한다.

---

## Typed Context Block 구조

```
[STEP 1: Step 0 강의 로드맵 분석 결과]   ← Phase 1 컨텍스트 (최상위 기준)
{step0_context}

[STEP 2-1: PDF 변환 MD]                  ← 이론 구조 / 세부 데이터 정확성
{pdf_text}

[STEP 2-2: 녹음 스크립트 TXT]            ← 구두 강조점 / Lecture Only 정보
{stt_text}

[STEP 2-3: 개인 필기]                    ← 학습자 주관 포인트
{note_text}
```

각 소스는 선택 입력이다. 없는 소스는 `"해당 없음"` 처리하며, LLM은 나머지 소스만으로 생성한다.

---

## 우선순위 설계 의도

LLM에게 우선순위를 명시하는 이유: STT 오인식 용어가 존재할 때, LLM이 `[STEP 1]`의 표준 용어 사전을 기준으로 자동 교정하도록 유도한다. 단순 concatenation 방식으로는 소스 간 충돌 시 LLM이 임의로 판단한다.

---

## make_note 프롬프트와의 연계

`src/prompts/make_note.md` (system prompt)는 이 블록 구조를 기반으로 동작한다:

- `[STEP 1]` → 중요도(★) 판정 기준, 용어 교정 기준
- `[STEP 2-2]` → `[Lecture Only]` 태그 추출 대상
- 전체 블록 → 5개 섹션 노트 생성 (Overview / Integrated Notes / Professor's Secret Tips / Core Memorization List / Self-Exam)
