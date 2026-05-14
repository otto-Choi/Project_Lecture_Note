import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session as DBSession

from database import get_db
import models

SESSION_TTL_HOURS = 72


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def verify_password(password: str, salt: str, stored_hash: str) -> bool:
    return hash_password(password, salt) == stored_hash


def create_session(user_id: int, db: DBSession) -> str:
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)
    session = models.Session(user_id=user_id, token=token, expires_at=expires)
    db.add(session)
    db.commit()
    return token


def get_current_user(
    authorization: str = Header(default=None),
    db: DBSession = Depends(get_db),
) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    token = authorization.split(" ", 1)[1]
    session = (
        db.query(models.Session)
        .filter(
            models.Session.token == token,
            models.Session.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다. 다시 로그인해주세요.")
    return session.user