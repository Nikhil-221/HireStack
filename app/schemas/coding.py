import enum
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# --- Test cases --------------------------------------------------------

class TestCaseIn(BaseModel):
    input: Optional[str] = ""
    expected_output: str
    is_sample: bool = False


class TestCaseOut(TestCaseIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class SampleTestCaseOut(BaseModel):
    """Version shown to candidates before they submit - sample cases only."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    input: Optional[str] = ""
    expected_output: str


# --- Questions -----------------------------------------------------------

class DifficultyEnum(str, enum.Enum):
    easy = "Easy"
    medium = "Medium"
    hard = "Hard"


class CodingQuestionCreate(BaseModel):
    job_id: Optional[int] = None
    title: str
    description: str
    difficulty: DifficultyEnum = DifficultyEnum.medium
    starter_code: Optional[str] = None
    time_limit_seconds: int = Field(default=5, ge=1, le=30)
    test_cases: List[TestCaseIn]


class CodingQuestionUpdate(CodingQuestionCreate):
    pass


class CodingQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: Optional[int] = None
    title: str
    description: str
    difficulty: DifficultyEnum
    starter_code: Optional[str] = None
    time_limit_seconds: int
    source: str
    created_at: datetime
    test_cases: List[TestCaseOut] = []


class GenerateQuestionRequest(BaseModel):
    job_id: Optional[int] = None
    job_title: str
    topic: Optional[str] = None
    difficulty: DifficultyEnum = DifficultyEnum.medium


class GenerateQuestionResponse(BaseModel):
    title: str
    description: str
    difficulty: DifficultyEnum
    starter_code: Optional[str] = None
    test_cases: List[TestCaseIn]


# --- Tests -----------------------------------------------------------------

class CodingTestStatus(str, enum.Enum):
    draft = "Draft"
    published = "Published"
    closed = "Closed"


class CodingTestCreate(BaseModel):
    job_id: int
    title: str
    duration_minutes: int = Field(default=60, ge=5, le=480)
    question_ids: List[int]


class CodingTestStatusUpdate(BaseModel):
    status: CodingTestStatus


class CodingTestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    title: str
    duration_minutes: int
    status: CodingTestStatus
    created_at: datetime
    questions: List[CodingQuestionOut] = []


class CodingTestListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    title: str
    duration_minutes: int
    status: CodingTestStatus
    created_at: datetime
    question_count: int = 0
    invitation_count: int = 0


# --- Invitations -------------------------------------------------------

class InviteCandidatesRequest(BaseModel):
    candidate_ids: List[int]


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    test_id: int
    candidate_id: int
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    status: str
    invited_at: datetime
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None


class CandidateTestOut(BaseModel):
    """What a candidate sees before/while taking a test."""
    model_config = ConfigDict(from_attributes=True)
    invitation_id: int
    test_id: int
    title: str
    duration_minutes: int
    status: str
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    job_title: Optional[str] = None


class CandidateQuestionOut(BaseModel):
    id: int
    title: str
    description: str
    difficulty: DifficultyEnum
    starter_code: Optional[str] = None
    sample_test_cases: List[SampleTestCaseOut] = []
    submission_status: Optional[str] = None
    last_score: Optional[float] = None


class CandidateTestDetailOut(CandidateTestOut):
    questions: List[CandidateQuestionOut] = []


# --- Submissions -------------------------------------------------------

class RunCodeRequest(BaseModel):
    code: str


class RunResultOut(BaseModel):
    passed: int
    total: int
    cases: List[dict]  # [{"input":..., "expected":..., "actual":..., "passed": bool}]


class SubmitCodeRequest(BaseModel):
    code: str


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    question_id: int
    passed_count: int
    total_count: int
    score: float
    status: str
    run_output: Optional[str] = None
    submitted_at: datetime
