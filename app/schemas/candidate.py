from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class CandidateProfileUpdate(BaseModel):
    phone: Optional[str] = None
    location: Optional[str] = None
    education: Optional[str] = None
    experience: Optional[str] = None
    skills: List[str] = []


class CandidateProfileOut(CandidateProfileUpdate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    email: str
    updated_at: datetime
