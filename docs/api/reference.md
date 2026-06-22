# API Reference

> Base URL: `https://lecturenote.up.railway.app`  
> 인증: Bearer 토큰 (`Authorization: Bearer <token>`)  
> 전체 엔드포인트: 19개

---

## Auth

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

---

## Core Pipeline

> 인증 필수 (Bearer 토큰)

| 메서드 | 경로 | 기능 |
|---|---|---|
| POST | `/api/create-step0` | 강의계획서 분석 → 커리큘럼 구조 추출 및 저장 (Phase 1) |
| POST | `/api/generate-note` | 멀티소스 인제스천 → SSE 스트리밍 노트 생성 (Phase 2) |
| GET | `/api/lectures` | 로그인 사용자의 강의 목록 |
| DELETE | `/api/lectures/{id}` | 강의 및 연관 레코드 삭제 (cascade) |
| GET | `/api/lectures/{id}/notes` | 특정 강의 하위 노트 목록 |
| GET | `/api/notes/{id}` | 구조화된 노트 조회 |
| PATCH | `/api/notes/{id}` | 노트 편집 |
| DELETE | `/api/notes/{id}` | 노트 삭제 |
| GET | `/api/download-note/{id}` | HTML 형식 출력물 다운로드 (token 쿼리 파라미터 지원) |

---

## SSE 이벤트 프로토콜

`POST /api/generate-note` 응답은 `text/event-stream`으로 전송된다.

```
{'t': 'c', 'v': chunk}      — 콘텐츠 청크
{'t': 'd', 'id': output_id} — 처리 완료 + 저장된 레코드 ID
{'t': 'err', 'msg': ...}    — 오류 발생
```

상세: [docs/architecture/sse-protocol.md](../architecture/sse-protocol.md)
