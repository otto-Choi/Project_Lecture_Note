from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Form, UploadFile, File, Depends, HTTPException, Header
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
import asyncio
import json
import markdown
import secrets

import models
import auth
from database import engine, get_db, SessionLocal
from services import pdf_parser, stt_service, aggregator, llm_service

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="LectureNote API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_migrate():
    """인라인 마이그레이션 — 누락 컬럼을 안전하게 추가."""
    migrations = [
        "ALTER TABLE lectures ADD COLUMN user_id INTEGER REFERENCES users(id)",
        "ALTER TABLE users ADD COLUMN email TEXT",
        "ALTER TABLE users ADD COLUMN display_name TEXT",
        "ALTER TABLE users ADD COLUMN school TEXT",
        "ALTER TABLE users ADD COLUMN major TEXT",
        "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'",
        "ALTER TABLE users ADD COLUMN locale TEXT DEFAULT 'ko'",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass


# ── Auth ──────────────────────────────────────────────────────

class AuthBody(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    school: Optional[str] = None
    major: Optional[str] = None


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    school: Optional[str] = None
    major: Optional[str] = None
    locale: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


def _user_dict(user: models.User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name,
        "school": user.school,
        "major": user.major,
        "plan": user.plan or "free",
        "locale": user.locale or "ko",
        "created_at": user.created_at.strftime("%Y-%m-%d") if user.created_at else "",
    }


@app.post("/api/auth/register")
def register(body: AuthBody, db: Session = Depends(get_db)):
    if len(body.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="아이디는 3자 이상이어야 합니다.")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자 이상이어야 합니다.")
    if db.query(models.User).filter(models.User.username == body.username).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")
    salt = secrets.token_hex(16)
    user = models.User(
        username=body.username.strip(),
        password_hash=auth.hash_password(body.password, salt),
        salt=salt,
        email=body.email,
        display_name=body.display_name,
        school=body.school,
        major=body.major,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = auth.create_session(user.id, db)
    return {"token": token, "user": _user_dict(user)}


@app.post("/api/auth/login")
def login(body: AuthBody, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == body.username.strip()).first()
    if not user or not auth.verify_password(body.password, user.salt, user.password_hash):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    token = auth.create_session(user.id, db)
    return {"token": token, "user": _user_dict(user)}


@app.post("/api/auth/logout")
def logout(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        db.query(models.Session).filter(models.Session.token == token).delete()
        db.commit()
    return {"ok": True}


@app.get("/api/auth/me")
def me(current_user: models.User = Depends(auth.get_current_user)):
    return _user_dict(current_user)


@app.patch("/api/auth/me")
def update_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.email is not None:
        current_user.email = body.email
    if body.school is not None:
        current_user.school = body.school
    if body.major is not None:
        current_user.major = body.major
    if body.locale is not None:
        current_user.locale = body.locale
    db.commit()
    db.refresh(current_user)
    return _user_dict(current_user)


@app.patch("/api/auth/password")
def change_password(
    body: PasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not auth.verify_password(body.current_password, current_user.salt, current_user.password_hash):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="새 비밀번호는 4자 이상이어야 합니다.")
    new_salt = secrets.token_hex(16)
    current_user.salt = new_salt
    current_user.password_hash = auth.hash_password(body.new_password, new_salt)
    # 다른 세션 무효화 (현재 세션 제외)
    db.query(models.Session).filter(models.Session.user_id == current_user.id).delete()
    db.commit()
    return {"ok": True}


@app.delete("/api/auth/me")
def delete_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db.delete(current_user)
    db.commit()
    return {"ok": True}


class FindIdBody(BaseModel):
    display_name: str
    school: Optional[str] = None

class FindPwBody(BaseModel):
    username: str

@app.post("/api/auth/find-id")
def find_id(body: FindIdBody, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.display_name == body.display_name.strip()
    ).first()
    if body.school:
        user = db.query(models.User).filter(
            models.User.display_name == body.display_name.strip(),
            models.User.school == body.school.strip(),
        ).first()
    if not user:
        raise HTTPException(status_code=404, detail="일치하는 계정을 찾을 수 없습니다.")
    return {"username": user.username}

@app.post("/api/auth/find-pw")
def find_pw(body: FindPwBody, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == body.username.strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="해당 아이디로 가입된 계정이 없습니다.")
    if not user.email:
        raise HTTPException(status_code=400, detail="가입 시 이메일을 등록하지 않아 임시 비밀번호를 발송할 수 없습니다.")
    # 실제 이메일 발송 없이 안내 메시지만 반환 (데모 단계)
    return {"message": f"{user.email[:3]}***로 임시 비밀번호를 전송했습니다. (데모: 실제 발송 미구현)"}


@app.get("/api/auth/stats")
def user_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    lecture_count = db.query(models.Lecture).filter(models.Lecture.user_id == current_user.id).count()
    note_ids = [
        o.id for o in db.query(models.Output.id)
        .join(models.Lecture, models.Output.lecture_id == models.Lecture.id)
        .filter(models.Lecture.user_id == current_user.id)
        .all()
    ]
    note_count = len(note_ids)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    notes_this_week = (
        db.query(models.Output)
        .join(models.Lecture, models.Output.lecture_id == models.Lecture.id)
        .filter(
            models.Lecture.user_id == current_user.id,
            models.Output.created_at >= week_ago,
        )
        .count()
    )
    return {
        "lecture_count": lecture_count,
        "note_count": note_count,
        "notes_this_week": notes_this_week,
    }


# ── Lectures ──────────────────────────────────────────────────

@app.get("/api/lectures")
def list_lectures(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    lectures = (
        db.query(models.Lecture)
        .filter(models.Lecture.user_id == current_user.id)
        .order_by(models.Lecture.id.desc())
        .all()
    )
    return [
        {"id": l.id, "title": l.title, "subject": l.subject,
         "created_at": l.created_at.strftime("%Y-%m-%d") if l.created_at else ""}
        for l in lectures
    ]


@app.delete("/api/lectures/{lecture_id}")
def delete_lecture(
    lecture_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    lecture = db.query(models.Lecture).filter(
        models.Lecture.id == lecture_id,
        models.Lecture.user_id == current_user.id,
    ).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="강의를 찾을 수 없습니다.")
    db.delete(lecture)
    db.commit()
    return {"ok": True}


@app.post("/api/create-step0")
async def create_step0(
    syllabus_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    file_bytes = await syllabus_file.read()
    content_type = syllabus_file.content_type or ""
    filename = syllabus_file.filename or ""

    if "pdf" in content_type or filename.lower().endswith(".pdf"):
        syllabus_text = pdf_parser.extract_text_from_pdf(file_bytes)
    else:
        syllabus_text = file_bytes.decode("utf-8")

    step0_result = llm_service.analyze_syllabus(syllabus_text)
    title, subject = llm_service.extract_lecture_meta(step0_result)

    lecture = models.Lecture(
        user_id=current_user.id,
        title=title,
        subject=subject,
        step0_analysis=step0_result,
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    return {
        "lecture_id": lecture.id,
        "title": lecture.title,
        "subject": lecture.subject,
        "step0_analysis": lecture.step0_analysis,
    }


@app.post("/api/generate-note")
async def generate_note(
    lecture_id: int = Form(...),
    week: Optional[int] = Form(None),
    pdf_file: Optional[UploadFile] = File(None),
    audio_file: Optional[UploadFile] = File(None),
    note_text: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    lecture = db.query(models.Lecture).filter(
        models.Lecture.id == lecture_id,
        models.Lecture.user_id == current_user.id,
    ).first()
    if not lecture:
        raise HTTPException(status_code=404, detail=f"lecture_id {lecture_id}에 해당하는 강의가 없습니다.")

    step0 = lecture.step0_analysis or ""

    # PDF + STT 병렬 처리
    pdf_bytes   = (await pdf_file.read())   if pdf_file   else None
    audio_bytes = (await audio_file.read()) if audio_file else None
    audio_mime  = (audio_file.content_type or "audio/mp4") if audio_file else "audio/mp4"

    loop = asyncio.get_event_loop()

    async def _run_pdf():
        if pdf_bytes:
            return await loop.run_in_executor(None, pdf_parser.extract_text_from_pdf, pdf_bytes)
        return ""

    async def _run_stt():
        if audio_bytes:
            return await loop.run_in_executor(
                None, stt_service.process_audio_to_text, audio_bytes, audio_mime
            )
        return ""

    pdf_text, stt_text = await asyncio.gather(_run_pdf(), _run_stt())

    aggregated = aggregator.aggregate_sources(
        step0=step0,
        pdf_text=pdf_text,
        stt_text=stt_text,
        note_text=note_text or "",
    )

    for source_type, content in [("PDF", pdf_text), ("STT", stt_text), ("NOTE", note_text or "")]:
        if content:
            db.add(models.Source(lecture_id=lecture_id, type=source_type, content=content))
    db.commit()

    def event_stream():
        full_text = ""
        try:
            for chunk in llm_service.generate_lecture_note_stream(aggregated):
                full_text += chunk
                yield f"data: {json.dumps({'t': 'c', 'v': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'t': 'err', 'msg': str(e)})}\n\n"
            return

        save_db = SessionLocal()
        try:
            output = models.Output(lecture_id=lecture_id, week=week, summary=full_text)
            save_db.add(output)
            save_db.commit()
            save_db.refresh(output)
            yield f"data: {json.dumps({'t': 'd', 'id': output.id, 'lid': lecture_id})}\n\n"
        finally:
            save_db.close()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/lectures/{lecture_id}/notes")
def list_notes(
    lecture_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    lecture = db.query(models.Lecture).filter(
        models.Lecture.id == lecture_id,
        models.Lecture.user_id == current_user.id,
    ).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="강의를 찾을 수 없습니다.")
    outputs = (
        db.query(models.Output)
        .filter(models.Output.lecture_id == lecture_id)
        .order_by(models.Output.id.asc())
        .all()
    )
    return [
        {"id": o.id, "week": o.week,
         "created_at": o.created_at.strftime("%Y-%m-%d %H:%M") if o.created_at else ""}
        for o in outputs
    ]


@app.get("/api/notes/{output_id}")
def get_note(
    output_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    output = db.query(models.Output).filter(models.Output.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    # 소유권 확인
    lecture = db.query(models.Lecture).filter(
        models.Lecture.id == output.lecture_id,
        models.Lecture.user_id == current_user.id,
    ).first()
    if not lecture:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    return {
        "id": output.id,
        "lecture_id": output.lecture_id,
        "note": output.summary,
        "created_at": output.created_at.strftime("%Y-%m-%d %H:%M") if output.created_at else "",
    }


@app.delete("/api/notes/{output_id}")
def delete_note(
    output_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    output = db.query(models.Output).filter(models.Output.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    lecture = db.query(models.Lecture).filter(
        models.Lecture.id == output.lecture_id,
        models.Lecture.user_id == current_user.id,
    ).first()
    if not lecture:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    db.delete(output)
    db.commit()
    return {"ok": True}


class NoteUpdate(BaseModel):
    summary: str


@app.patch("/api/notes/{output_id}")
def update_note(
    output_id: int,
    body: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    output = db.query(models.Output).filter(models.Output.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    lecture = db.query(models.Lecture).filter(
        models.Lecture.id == output.lecture_id,
        models.Lecture.user_id == current_user.id,
    ).first()
    if not lecture:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    output.summary = body.summary
    db.commit()
    return {"ok": True}


@app.get("/api/download-note/{output_id}")
def download_note(
    output_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
    authorization: str = Header(default=None),
):
    # Accept token from query param (for window.open downloads) or header
    raw_token = token or (authorization.split(" ", 1)[1] if authorization and authorization.startswith("Bearer ") else None)
    if not raw_token:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    session = db.query(models.Session).filter(
        models.Session.token == raw_token,
        models.Session.expires_at > datetime.now(timezone.utc),
    ).first()
    if not session:
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다.")
    current_user = session.user
    output = db.query(models.Output).filter(models.Output.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail=f"output_id {output_id}에 해당하는 노트가 없습니다.")
    lecture = db.query(models.Lecture).filter(
        models.Lecture.id == output.lecture_id,
        models.Lecture.user_id == current_user.id,
    ).first()
    if not lecture:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    html_body = markdown.markdown(
        output.summary,
        extensions=["tables", "fenced_code"],
    )
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
         max-width: 860px; margin: 0 auto; padding: 40px;
         line-height: 1.6; color: #222; font-size: 15px; }}
  h1 {{ font-size: 1.6em; margin: 1.2em 0 0.4em; color: #1a1a2e; }}
  h2 {{ font-size: 1.35em; margin: 1em 0 0.3em; color: #1a1a2e; }}
  h3 {{ font-size: 1.15em; margin: 0.9em 0 0.3em; color: #1a1a2e;
        border-bottom: 1px solid #e0e0e0; padding-bottom: 3px; }}
  h4 {{ font-size: 1em; margin: 0.7em 0 0.2em; }}
  p {{ margin: 0.4em 0; }}
  ul, ol {{ margin: 0.3em 0; padding-left: 1.5em; }}
  li {{ margin: 0.15em 0; }}
  table {{ border-collapse: collapse; width: 100%; margin: 0.8em 0; }}
  th, td {{ border: 1px solid #ccc; padding: 5px 10px; text-align: left; }}
  th {{ background: #f4f4f4; }}
  code {{ background: #f5f5f5; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }}
  pre {{ background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }}
  @media print {{ body {{ padding: 20px; }} }}
</style>
</head>
<body>{html_body}</body>
</html>"""

    return Response(
        content=html.encode("utf-8"),
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=lecture_note_{output_id}.html"},
    )


@app.get("/health")
def health():
    return {"status": "ok"}


app.mount("/", StaticFiles(directory="public", html=True), name="static")
