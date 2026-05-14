def aggregate_sources(
    step0: str,
    pdf_text: str,
    stt_text: str,
    note_text: str,
) -> str:
    """
    make_note.md의 4단계 워크플로우에 맞춰 4가지 소스를 단일 컨텍스트로 조립한다.
    LLM이 각 소스의 역할과 우선순위를 명확히 인식하도록 태그로 구분한다.
    """
    merged = f"""[STEP 1: Step 0 강의 로드맵 분석 결과]
{step0 if step0 else '해당 없음'}

[STEP 2-1: PDF 변환 MD]
{pdf_text if pdf_text else '해당 없음'}

[STEP 2-2: 녹음 스크립트 TXT]
{stt_text if stt_text else '해당 없음'}

[STEP 2-3: 개인 필기]
{note_text if note_text else '해당 없음'}"""

    return merged
