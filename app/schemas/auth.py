from typing import Literal
from pydantic import BaseModel, ConfigDict

class RegisterRequest(BaseModel):
    name: str
    email: str
    username: str
    password: str
    role: Literal["recruiter"]

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    username: str
    role: str
