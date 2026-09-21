from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from ..models import CodingQuestionDifficulty


class TestCasePayload(BaseModel):
    input: str
    expected_output: str
    is_sample: bool = False


class CodingQuestionCreate(BaseModel):
    title: str
    description: str
    difficulty: CodingQuestionDifficulty
    job_id: Optional[int] = None
    starter_code: Optional[Dict[str, str]] = None
    test_cases: List[TestCasePayload] = Field(default_factory=list)


class CodingQuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[CodingQuestionDifficulty] = None
    job_id: Optional[int] = None
    starter_code: Optional[Dict[str, str]] = None
    test_cases: Optional[List[TestCasePayload]] = None


class TestCaseOut(TestCasePayload):
    model_config = ConfigDict(from_attributes=True)

    id: int


class CodingQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    difficulty: CodingQuestionDifficulty
    job_id: Optional[int] = None
    job_title: Optional[str] = None
    starter_code: Optional[Dict[str, str]] = None
    created_at: datetime
    test_cases: List[TestCaseOut]


class CodingQuestionGenerateRequest(BaseModel):
    count: int = Field(default=2, ge=1, le=2)


class CodingQuestionGenerateResponse(BaseModel):
    questions: List["CodingQuestionGenerateItem"]


class CodingQuestionGenerateItem(BaseModel):
    title: str
    description: str
    difficulty: CodingQuestionDifficulty
    test_cases: List[TestCasePayload]
