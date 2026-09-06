from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from starlette import status

from ..database import SessionLocal
from ..models import CodingQuestionDifficulty
from ..schemas.coding_question import (
    CodingQuestionCreate,
    CodingQuestionOut,
    CodingQuestionUpdate,
)
from ..services.coding_question_service import CodingQuestionService
from .auth import require_recruiter


router = APIRouter(
    prefix="/admin/coding-questions",
    tags=["coding questions"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(require_recruiter)]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CodingQuestionOut)
async def create_coding_question(
    db: db_dependency,
    user: user_dependency,
    payload: CodingQuestionCreate,
):
    return CodingQuestionService(db).create_question(payload)


@router.get("", status_code=status.HTTP_200_OK, response_model=List[CodingQuestionOut])
async def list_coding_questions(
    db: db_dependency,
    user: user_dependency,
    job_id: Optional[int] = Query(None),
    difficulty: Optional[CodingQuestionDifficulty] = Query(None),
):
    return CodingQuestionService(db).list_questions(job_id, difficulty)


@router.get("/{question_id}", status_code=status.HTTP_200_OK, response_model=CodingQuestionOut)
async def get_coding_question(
    db: db_dependency,
    user: user_dependency,
    question_id: int,
):
    return CodingQuestionService(db).get_question(question_id)


@router.put("/{question_id}", status_code=status.HTTP_200_OK, response_model=CodingQuestionOut)
async def update_coding_question(
    db: db_dependency,
    user: user_dependency,
    question_id: int,
    payload: CodingQuestionUpdate,
):
    return CodingQuestionService(db).update_question(question_id, payload)


@router.delete("/{question_id}", status_code=status.HTTP_200_OK)
async def delete_coding_question(
    db: db_dependency,
    user: user_dependency,
    question_id: int,
):
    CodingQuestionService(db).delete_question(question_id)
    return {"message": "Coding question deleted"}
