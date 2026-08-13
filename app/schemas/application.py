import enum
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class ApplicationStatus(str, enum.Enum):
    applied = "Applied"
    shortlisted = "Shortlisted"
    rejected = "Rejected"


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ResumeScreeningDetails(BaseModel):
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    experience_fit: str = ""
    summary: str = ""


class CandidateApplicationOut(BaseModel):
    id: int
    job_id: int
    job_title: str
    job_location: str
    job_deadline: Optional[date] = None
    resume_filename: str
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime


class JobApplicantOut(BaseModel):
    id: int
    candidate_id: int
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    resume_filename: str
    resume_screening_score: Optional[int] = None
    resume_screening_details: Optional[ResumeScreeningDetails] = None
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime


class AllCandidatesOut(BaseModel):
    id: int
    application_id: int
    candidate_id: int
    name: str
    email: str
    job_title: str
    job_id: int
    resume_screening_score: Optional[int] = None
    resume_screening_details: Optional[ResumeScreeningDetails] = None
    coding_round_score: Optional[int] = None
    interview_score: Optional[int] = None
    status: ApplicationStatus
    applied_at: datetime

