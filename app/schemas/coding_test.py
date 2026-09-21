from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, PositiveInt


class CodingTestCreate(BaseModel):
    job_id: Optional[PositiveInt] = None
    title: str = Field(min_length=1)
    duration_minutes: PositiveInt
    question_ids: List[PositiveInt] = Field(default_factory=list)


class CodingTestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    duration_minutes: PositiveInt | None = None
    question_ids: List[PositiveInt] | None = None


class CodingTestQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    difficulty: str


class CodingTestSummaryOut(BaseModel):
    id: int
    job_id: Optional[int]
    job_title: Optional[str]
    title: str
    duration_minutes: int
    question_count: int
    created_at: datetime


class CodingTestOut(CodingTestSummaryOut):
    questions: List[CodingTestQuestionOut]
