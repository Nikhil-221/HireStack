from datetime import datetime

from pydantic import BaseModel, PositiveInt


class CodingTestInviteCreate(BaseModel):
    candidate_id: PositiveInt


class CodingTestInviteOut(BaseModel):
    id: int
    candidate_id: int
    coding_test_id: int
    token: str
    status: str
    expires_at: datetime
    created_at: datetime
