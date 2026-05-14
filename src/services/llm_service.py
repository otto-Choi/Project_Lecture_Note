import os
import pathlib
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

_PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
_SYLLABUS_PROMPT_PATH = _PROJECT_ROOT / "docs" / "planning" / "syllabus_analysis.md"
_MAKE_NOTE_PROMPT_PATH = _PROJECT_ROOT / "docs" / "planning" / "make_note.md"

_MODEL_ID = "gemini-2.5-flash"


def _call_gemini(system_instruction: str, user_prompt: str) -> str:
    response = _client.models.generate_content(
        model=_MODEL_ID,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
        ),
    )
    return response.text


def analyze_syllabus(syllabus_text: str) -> str:
    system_instruction = _SYLLABUS_PROMPT_PATH.read_text(encoding="utf-8")
    return _call_gemini(system_instruction, syllabus_text)


def generate_lecture_note(aggregated_text: str) -> str:
    system_instruction = _MAKE_NOTE_PROMPT_PATH.read_text(encoding="utf-8")
    return _call_gemini(system_instruction, aggregated_text)


def generate_lecture_note_stream(aggregated_text: str):
    """LLM으로 통합 요약 노트를 청크 단위로 스트리밍한다."""
    system_instruction = _MAKE_NOTE_PROMPT_PATH.read_text(encoding="utf-8")
    for chunk in _client.models.generate_content_stream(
        model=_MODEL_ID,
        contents=aggregated_text,
        config=types.GenerateContentConfig(system_instruction=system_instruction),
    ):
        if chunk.text:
            yield chunk.text


def extract_lecture_meta(step0_text: str) -> tuple[str, str]:
    """Step 0 분석 결과에서 과목명·교수명을 추출한다. 실패 시 '미확인' 반환."""
    prompt = (
        "아래 강의 분석 결과에서 과목명과 담당교수명을 찾아 딱 두 줄로만 답해.\n"
        "형식:\n과목명: [값]\n교수명: [값]\n"
        "정보가 없으면 '미확인'으로 써.\n\n"
        + step0_text[:3000]
    )
    try:
        response = _client.models.generate_content(model=_MODEL_ID, contents=prompt)
        text = response.text or ""
        title = subject = "미확인"
        for line in text.splitlines():
            if line.startswith("과목명:"):
                title = line.split(":", 1)[1].strip() or "미확인"
            elif line.startswith("교수명:"):
                subject = line.split(":", 1)[1].strip() or "미확인"
        return title, subject
    except Exception:
        return "미확인", "미확인"
