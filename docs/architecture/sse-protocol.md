# SSE Streaming Protocol

> `POST /api/generate-note` 응답: `Content-Type: text/event-stream`

---

## 도입 배경

초기 구현에서 LLM 응답 대기 시간은 1~2분에 달해 UI가 무응답 상태처럼 동작했다. FastAPI `StreamingResponse` + SSE로 전환하여 첫 청크 도착 시 UI를 즉시 전환하고 청크 단위 실시간 렌더링으로 해결했다.

---

## 이벤트 타입

| 타입 | 페이로드 | 의미 |
|---|---|---|
| `c` | `{'t': 'c', 'v': chunk}` | 콘텐츠 청크 — 마크다운 텍스트 조각 |
| `d` | `{'t': 'd', 'id': output_id}` | 처리 완료 + DB에 저장된 레코드 ID |
| `err` | `{'t': 'err', 'msg': ...}` | 오류 발생 |

---

## 클라이언트 처리 흐름

```
EventSource open
  → 'c' 이벤트: 텍스트 append + 자동 스크롤
  → 'd' 이벤트: 스트리밍 종료, output_id로 노트 조회
  → 'err' 이벤트: 오류 메시지 표시, EventSource close
```

---

## 구현 위치

- 서버: `src/services/llm_service.py` → `generate_lecture_note_stream()`
- API 핸들러: `src/main.py` → `POST /api/generate-note`
- 클라이언트: `public/assets/app.js` → EventSource 처리 로직
