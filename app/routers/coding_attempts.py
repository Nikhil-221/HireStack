from typing import Annotated

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from starlette import status

from ..database import SessionLocal
from ..schemas.coding_attempt import CodingAttemptPayload
from ..services.coding_attempt_service import CodingAttemptService
from .auth import candidate_dependency


router = APIRouter(prefix="/candidate/test-attempt", tags=["candidate test attempts"])
VIDEO_DIRECTORY = Path("videos")


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


@router.post("/{token}/upload-recording")
async def upload_test_recording(
    db: db_dependency,
    user: user_dependency,
    token: str,
    recording: UploadFile = File(...),
):
    if recording.content_type not in {"video/webm", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recording must be a WebM video")

    invite = CodingAttemptService(db).get_recording_invite(token, user["id"])
    VIDEO_DIRECTORY.mkdir(parents=True, exist_ok=True)
    file_path = VIDEO_DIRECTORY / f"{uuid4()}.webm"
    with file_path.open("wb") as destination:
        while chunk := await recording.read(1024 * 1024):
            destination.write(chunk)

    invite.recording_path = str(file_path)
    db.commit()
    return {"recording_path": str(file_path)}