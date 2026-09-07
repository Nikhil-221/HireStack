from typing import Annotated, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette import status

from ..database import SessionLocal
from ..schemas.coding_invite import CodingTestInviteCreate, CodingTestInviteOut
from ..schemas.coding_test import CodingTestCreate, CodingTestOut, CodingTestSummaryOut, CodingTestUpdate
from ..services.coding_invite_service import CodingInviteService
from ..services.coding_test_service import CodingTestService
from .auth import require_recruiter


router = APIRouter(prefix="/admin/coding-tests", tags=["coding tests"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(require_recruiter)]


@router.post("", response_model=CodingTestOut, status_code=status.HTTP_201_CREATED)
async def create_coding_test(db: db_dependency, user: user_dependency, payload: CodingTestCreate):
    return CodingTestService(db).create_test(payload)


@router.get("", response_model=List[CodingTestSummaryOut])
async def list_coding_tests(db: db_dependency, user: user_dependency):
    return CodingTestService(db).list_tests()


@router.get("/{test_id}", response_model=CodingTestOut)
async def get_coding_test(db: db_dependency, user: user_dependency, test_id: int):
    return CodingTestService(db).get_test(test_id)


@router.put("/{test_id}", response_model=CodingTestOut)
async def update_coding_test(db: db_dependency, user: user_dependency, test_id: int, payload: CodingTestUpdate):
    return CodingTestService(db).update_test(test_id, payload)


@router.delete("/{test_id}")
async def delete_coding_test(db: db_dependency, user: user_dependency, test_id: int):
    CodingTestService(db).delete_test(test_id)
    return {"message": "Coding test deleted"}


@router.post("/{test_id}/invite", response_model=CodingTestInviteOut, status_code=status.HTTP_201_CREATED)
async def invite_candidate(
    db: db_dependency,
    user: user_dependency,
    test_id: int,
    payload: CodingTestInviteCreate,
):
    return CodingInviteService(db).create_invite(test_id, payload.candidate_id)
