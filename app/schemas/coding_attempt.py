from typing import Optional

from pydantic import BaseModel


class CodingAttemptPayload(BaseModel):
    question_id: int
    code: str
    language: str


class CodingAttemptQuestionOut(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    starter_code: Optional[dict[str, str]] = None
    test_cases: list[dict]
    attempted: bool
    submission_status: Optional[str] = None
    last_code: Optional[str] = None
    last_language: Optional[str] = None