from .database import Base
from enum import Enum as PyEnum
from uuid import uuid4

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.sql import func
from sqlalchemy import Date
from datetime import datetime


class CodingQuestionDifficulty(str, PyEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class CodingTestInviteStatus(str, PyEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class CodingSubmissionStatus(str, PyEnum):
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    RUNTIME_ERROR = "runtime_error"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    PENDING = "pending"


class NotificationType(str, PyEnum):
    CODING_TEST = "coding_test"
    INTERVIEW = "interview"
    STATUS_UPDATE = "status_update"
    APPLICATION_CONFIRMATION = "application_confirmation"


def _enum_values(enum_class):
    return [member.value for member in enum_class]

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
    deadline = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    responsibilities = Column(ARRAY(String), nullable=True)
    required_skills = Column(ARRAY(String), nullable=True)
    preferred_skills = Column(ARRAY(String), nullable=True)
    qualifications = Column(ARRAY(String), nullable=True)
    status = Column(String, nullable=False, default="Draft")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    education = Column(Text, nullable=True)
    experience = Column(Text, nullable=True)
    skills = Column(ARRAY(String), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("job_id", "candidate_id", name="uq_application_job_candidate"),)

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    resume_filename = Column(String, nullable=False)
    resume_path = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Applied")
    resume_screening_score = Column(Integer, nullable=True)
    resume_screening_details = Column(JSONB, nullable=True)
    coding_round_score = Column(Integer, nullable=True)
    interview_score = Column(Integer, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CodingQuestion(Base):
    __tablename__ = "coding_questions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(
        SQLEnum(
            CodingQuestionDifficulty,
            name="coding_question_difficulty",
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)
    starter_code = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("coding_questions.id"), nullable=False, index=True)
    input = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, nullable=False, default=False)


class CodingTest(Base):
    __tablename__ = "coding_tests"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CodingTestQuestion(Base):
    __tablename__ = "coding_test_questions"

    id = Column(Integer, primary_key=True, index=True)
    coding_test_id = Column(Integer, ForeignKey("coding_tests.id"), nullable=False, index=True)
    coding_question_id = Column(Integer, ForeignKey("coding_questions.id"), nullable=False, index=True)


class CodingTestInvite(Base):
    __tablename__ = "coding_test_invites"

    id = Column(Integer, primary_key=True, index=True)
    coding_test_id = Column(Integer, ForeignKey("coding_tests.id"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, default=lambda: str(uuid4()))
    status = Column(
        SQLEnum(
            CodingTestInviteStatus,
            name="coding_test_invite_status",
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

    id = Column(Integer, primary_key=True, index=True)
    invite_id = Column(Integer, ForeignKey("coding_test_invites.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("coding_questions.id"), nullable=False, index=True)
    code = Column(Text, nullable=False)
    language = Column(String, nullable=False)
    status = Column(
        SQLEnum(
            CodingSubmissionStatus,
            name="coding_submission_status",
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    passed_cases = Column(Integer, nullable=False)
    total_cases = Column(Integer, nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(
        SQLEnum(
            NotificationType,
            name="notification_type",
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    related_token = Column(String, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, server_default=func.false())
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
