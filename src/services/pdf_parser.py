import fitz  # PyMuPDF


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    PDF 바이트 스트림에서 텍스트를 추출한다.
    페이지 구분자를 삽입하여 LLM이 문서 구조를 인식하기 쉽게 한다.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for i, page in enumerate(doc, start=1):
        text = page.get_text("text").strip()
        if text:
            pages.append(f"--- [Page {i}] ---\n{text}")
    doc.close()
    return "\n\n".join(pages)
