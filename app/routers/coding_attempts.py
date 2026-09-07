from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..schemas.coding_attempt import CodingAttemptPayload
from ..services.coding_attempt_service import CodingAttemptService
from .auth import candidate_dependency


router = APIRouter(prefix="/candidate/test-attempt", tags=["candidate test attempts"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = candidate_dependency


@router.get("/{token}")
async def get_test_attempt(db: db_dependency, user: user_dependency, token: str):
    return CodingAttemptService(db).get_attempt(token, user["id"])


@router.post("/{token}/run")
async def run_test_attempt(
    db: db_dependency,
    user: user_dependency,
    token: str,
    payload: CodingAttemptPayload,
):
    return CodingAttemptService(db).run(
        token,
        user["id"],
        payload.question_id,
        payload.code,
        payload.language,
    )


@router.post("/{token}/submit")
async def submit_test_attempt(
    db: db_dependency,
    user: user_dependency,
    token: str,
    payload: CodingAttemptPayload,
):
    return CodingAttemptService(db).submit(
        token,
        user["id"],
        payload.question_id,
        payload.code,
        payload.language,
    )


@router.post("/{token}/end")
async def end_test_attempt(db: db_dependency, user: user_dependency, token: str):
    return CodingAttemptService(db).end(token, user["id"])