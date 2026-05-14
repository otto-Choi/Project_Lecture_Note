import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
_MODEL_ID = "gemini-2.5-flash"


def process_audio_to_text(audio_bytes: bytes, mime_type: str = "audio/mp4") -> str:
    """오디오 바이트를 Gemini에 직접 전달하여 STT 결과 텍스트를 반환한다."""
    # 브라우저 녹음(webm;codecs=opus) 등 세부 코덱 파라미터는 Gemini가 지원하는 기본 타입으로 정규화
    base_mime = mime_type.split(";")[0].strip() if mime_type else "audio/mp4"
    response = _client.models.generate_content(
        model=_MODEL_ID,
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=base_mime),
            "이 음성을 한국어로 그대로 받아쓰기 해줘. 말한 내용만 출력하고 다른 설명은 하지 마.",
        ],
    )
    return response.text
