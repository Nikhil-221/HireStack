from datetime import datetime

from pydantic import BaseModel, Field, PositiveInt


class InterviewInviteRequest(BaseModel):
    candidate_id: PositiveInt


class InterviewInviteOut(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    token: str
    status: str
    expires_at: datetime
    created_at: datetime


class InterviewStatusOut(BaseModel):
    status: str | None
    interview_score: float | None
    interview_session_id: int | None


class InterviewAnswerRequest(BaseModel):
    question_id: PositiveInt
    transcript: str = Field(max_length=5000)


class InterviewQuestionOut(BaseModel):
    id: int
    order_index: int
    question_text: str
    answer_transcript: str | None


class InterviewSessionOut(BaseModel):
    status: str
    opened_at: datetime | None
    expires_at: datetime
    questions: list[InterviewQuestionOut]


class InterviewAnswerOut(BaseModel):
    question_id: int
    saved: bool


class InterviewEndOut(BaseModel):
    status: str