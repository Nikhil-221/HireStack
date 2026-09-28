from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from starlette import status

from ..database import SessionLocal
from ..schemas.interview import (
    InterviewAnswerOut,
    InterviewAnswerRequest,
    InterviewEndOut,
    InterviewInviteOut,
    InterviewInviteRequest,
    InterviewSessionOut,
    InterviewStatusOut,
)
from ..services.interview_service import InterviewService
from .auth import candidate_dependency, require_recruiter


router = APIRouter(tags=["interviews"])
VIDEO_DIRECTORY = Path("videos")
MAX_RECORDING_BYTES = 300 * 1024 * 1024


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
recruiter_dependency = Annotated[dict, Depends(require_recruiter)]


@router.post(
    "/admin/jobs/{job_id}/interview-invite",
    response_model=InterviewInviteOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_interview_invite(
    db: db_dependency,
    user: recruiter_dependency,
    job_id: int,
    payload: InterviewInviteRequest,
):
    return InterviewService(db).create_invite(job_id, payload.candidate_id)


@router.get(
    "/admin/jobs/{job_id}/candidates/{candidate_id}/interview-status",
    response_model=InterviewStatusOut,
)
async def get_job_interview_status(
    db: db_dependency,
    user: recruiter_dependency,
    job_id: int,
    candidate_id: int,
):
    return InterviewService(db).get_job_interview_status(job_id, candidate_id)


@router.get("/candidate/interview/{token}", response_model=InterviewSessionOut)
async def get_interview(db: db_dependency, user: candidate_dependency, token: str):
    return InterviewService(db).open_interview(token, user["id"])


@router.post(
    "/candidate/interview/{token}/answer",
    response_model=InterviewAnswerOut,
)
async def submit_interview_answer(
    db: db_dependency,
    user: candidate_dependency,
    token: str,
    payload: InterviewAnswerRequest,
):
    return InterviewService(db).submit_answer(
        token,
        user["id"],
        payload.question_id,
        payload.transcript,
    )


@router.post("/candidate/interview/{token}/end", response_model=InterviewEndOut)
async def end_interview(db: db_dependency, user: candidate_dependency, token: str):
    return InterviewService(db).end_interview(token, user["id"])


@router.post("/candidate/interview/{token}/upload-recording")
async def upload_interview_recording(
    db: db_dependency,
    user: candidate_dependency,
    token: str,
    recording: UploadFile = File(...),
):
    if not (recording.content_type or "").lower().startswith("video/webm"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recording must be a WebM video",
        )

    interview = InterviewService(db).get_recording_session(token, user["id"])
    VIDEO_DIRECTORY.mkdir(parents=True, exist_ok=True)
    file_path = VIDEO_DIRECTORY / f"{uuid4()}.webm"
    total_bytes = 0
    try:
        with file_path.open("wb") as destination:
            while chunk := await recording.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_RECORDING_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="Recording exceeds the 300 MB limit",
                    )
                destination.write(chunk)

        interview.recording_path = str(file_path)
        db.commit()
    except HTTPException:
        file_path.unlink(missing_ok=True)
        db.rollback()
        raise
    except Exception as exc:
        file_path.unlink(missing_ok=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the interview recording",
        ) from exc

    return {"recording_path": str(file_path)}