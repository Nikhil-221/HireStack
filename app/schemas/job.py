import enum
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class JobStatus(str, enum.Enum):
    draft = "Draft"
    open = "Open"
    closed = "Closed"

class JobBase(BaseModel):
    title: str
    department: str
    location: str
    employment_type: str
    experience_required: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    openings: int = 1
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    qualifications: Optional[List[str]] = None

class JobCreate(JobBase):
    deadline: date

class JobUpdate(JobBase):
    deadline: date

class JobStatusUpdate(BaseModel):
    status: JobStatus

class JobOut(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: JobStatus
    deadline: Optional[date] = None
    created_at: datetime
    updated_at: datetime

class GenerateJDRequest(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    experience_required: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    openings: Optional[int] = None
    description: Optional[str] = None

class GenerateJDResponse(BaseModel):
    description: str
    responsibilities: List[str]
    required_skills: List[str]
    preferred_skills: List[str]
    qualifications: List[str]
