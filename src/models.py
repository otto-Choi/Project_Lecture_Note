from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """앱 사용자"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    salt = Column(String(64), nullable=False)
    email = Column(String(255), nullable=True)
    display_name = Column(String(64), nullable=True)
    school = Column(String(128), nullable=True)
    major = Column(String(128), nullable=True)
    plan = Column(String(32), nullable=True, default="free")   # "free" | "pro"
    locale = Column(String(16), nullable=True, default="ko")   # "ko" | "en"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lectures = relationship("Lecture", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """로그인 세션 토큰"""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="sessions")


class Lecture(Base):
    """강의 기본 정보 및 Step 0 분석 결과 저장"""
    __tablename__ = "lectures"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable: 기존 데이터 호환
    title = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    step0_analysis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="lectures")
    sources = relationship("Source", back_populates="lecture", cascade="all, delete-orphan")
    outputs = relationship("Output", back_populates="lecture", cascade="all, delete-orphan")


class Source(Base):
    """주차별 원본 입력 소스 저장 (STT / PDF / NOTE)"""
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id"), nullable=False)
    type = Column(String(10), nullable=False)   # "STT" | "PDF" | "NOTE"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lecture = relationship("Lecture", back_populates="sources")


class Output(Base):
    """LLM이 생성한 요약 노트 및 예상 문제 저장"""
    __tablename__ = "outputs"

    id = Column(Integer, primary_key=True, index=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id"), nullable=False)
    week = Column(Integer, nullable=True)             # 주차 번호 (사용자 입력)
    summary = Column(Text, nullable=False)   # 마크다운 통합 요약 노트
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lecture = relationship("Lecture", back_populates="outputs")
