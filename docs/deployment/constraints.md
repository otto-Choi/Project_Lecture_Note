# 운영 제약 및 개선 계획

> 현재 상태: alpha/beta 수준. 아래 항목은 인지된 기술 부채이며 단계적 해소 예정.

---

## 현재 제약

| 항목 | 현재 상태 | 개선 방향 |
|---|---|---|
| 예외 처리 | `generate-note`, `create-step0` 핵심 엔드포인트 예외 처리 미적용 — Gemini quota 초과·업로드 실패 시 비구조적 500 오류 반환 | structured error response + retry 로직 |
| DB 영속성 | SQLite 경로 미분리 — 컨테이너 재배포 시 데이터 소실 위험 | Railway Persistent Volume + `DATABASE_URL` 환경변수화 |
| 비밀번호 해시 | SHA256 단방향 해시 (salt 포함) — alpha 수준 | bcrypt 전환 |
| Cold start | Render/Railway 무료 플랜: 15분 비활성 시 슬립 → 최초 요청 약 30초 지연 | 유료 플랜 전환 또는 keep-alive ping |
| 이메일 발송 | 비밀번호 찾기: 실제 이메일 발송 미구현 (데모 메시지만 반환) | SendGrid / SMTP 연동 |

---

## 배포 설정

상세 Railway 배포 순서 및 환경변수 설정 → [docs/plan.md](../plan.md)
