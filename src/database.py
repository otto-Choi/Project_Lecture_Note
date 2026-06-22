from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import pathlib

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/lecture.db")

# SQLite 사용 시 data/ 디렉토리가 없으면 파일 생성에 실패하므로 미리 생성
if DATABASE_URL.startswith("sqlite"):
    db_path = DATABASE_URL.split("///", 1)[-1]
    pathlib.Path(db_path).parent.mkdir(parents=True, exist_ok=True)

# check_same_thread=False: FastAPI의 멀티스레드 환경에서 SQLite를 안전하게 사용하기 위한 설정
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI 의존성 주입용 DB 세션 생성기"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
