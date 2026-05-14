from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Lecture(Base):
    """강의 기본 정보 및 Step 0 분석 결과 저장"""
    __tablename__ = "lectures"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)       # 강의명
    subject = Column(String(255), nullable=False)     # 과목명
    step0_analysis = Column(Text, nullable=True)      # 강의계획서 LLM 분석 결과 (마크다운)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

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
