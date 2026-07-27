from .database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlalchemy import Date
from datetime import datetime

class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String,nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    joining_date = Column(Date, server_default=func.current_date())

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    location = Column(String, nullable=False)
    employment_type = Column(String, nullable=False)
    experience_required = Column(String, nullable=False)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    openings = Column(Integer, nullable=False, default=1)
    description = Column(Text, nullable=True)
    responsibilities = Column(ARRAY(String), nullable=True)
    required_skills = Column(ARRAY(String), nullable=True)
    preferred_skills = Column(ARRAY(String), nullable=True)
    qualifications = Column(ARRAY(String), nullable=True)
    status = Column(String, nullable=False, default="Draft")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)