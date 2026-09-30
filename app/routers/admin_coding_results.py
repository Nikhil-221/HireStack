from collections import defaultdict
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette import status

from ..database import SessionLocal
from ..models import (
    Application,
    CandidateProfile,
    CodingQuestion,
    CodingSubmission,
    CodingTest,
    CodingTestInvite,
    CodingTestQuestion,
    InterviewQuestion,
    InterviewSession,
    Job,
    TestCase,
    Users,
)
from ..piston_service import evaluate_submission
from .auth import ALGORITHM, get_current_user, require_recruiter


router = APIRouter(prefix="/admin", tags=["admin coding results"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(require_recruiter)]
recruiter_dependency = Annotated[dict, Depends(require_recruiter)]
recording_bearer = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)
RECORDING_URL_TTL = timedelta(minutes=5)
RECORDING_CHUNK_SIZE = 64 * 1024


@router.get("/jobs/{job_id}/candidates-overview")
async def get_candidates_overview(db: db_dependency, user: user_dependency, job_id: int):
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    applications = (
        db.query(Application, Users, CandidateProfile)
        .join(Users, Users.id == Application.candidate_id)
        .outerjoin(CandidateProfile, CandidateProfile.user_id == Users.id)
        .filter(Application.job_id == job_id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    test_ids = [
        test.id
        for test in db.query(CodingTest)
        .filter(or_(CodingTest.job_id == job_id, CodingTest.job_id.is_(None)))
        .all()
    ]
    invites = (
        db.query(CodingTestInvite, CodingTest)
        .join(CodingTest, CodingTest.id == CodingTestInvite.coding_test_id)
        .filter(CodingTestInvite.coding_test_id.in_(test_ids))
        .order_by(CodingTestInvite.created_at.desc(), CodingTestInvite.id.desc())
        .all()
        if test_ids
        else []
    )
    invites_by_candidate: dict[int, list[tuple[CodingTestInvite, CodingTest]]] = defaultdict(list)
    for invite, test in invites:
        invites_by_candidate[invite.candidate_id].append((invite, test))

    candidate_ids = [candidate.id for _, candidate, _ in applications]
    interview_sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.job_id == job_id,
            InterviewSession.candidate_id.in_(candidate_ids),
        )
        .order_by(InterviewSession.created_at.desc(), InterviewSession.id.desc())
        .all()
        if candidate_ids
        else []
    )
    latest_interview_by_candidate = {}
    for interview in interview_sessions:
        latest_interview_by_candidate.setdefault(interview.candidate_id, interview)

    return {
        "job": {"id": job.id, "title": job.title},
        "candidates": [
            _candidate_overview(
                db,
                application,
                candidate,
                profile,
                invites_by_candidate.get(candidate.id, []),
                latest_interview_by_candidate.get(candidate.id),
            )
            for application, candidate, profile in applications
        ],
    }


@router.get("/interview-sessions/{session_id}")
async def get_interview_session(
    db: db_dependency,
    user: recruiter_dependency,
    session_id: int,
):
    row = (
        db.query(InterviewSession, Users.name, Job.title)
        .join(Users, Users.id == InterviewSession.candidate_id)
        .join(Job, Job.id == InterviewSession.job_id)
        .filter(InterviewSession.id == session_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

    interview, candidate_name, job_title = row
    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.session_id == interview.id)
        .order_by(InterviewQuestion.order_index)
        .all()
    )
    return {
        "id": interview.id,
        "candidate_name": candidate_name,
        "job_title": job_title,
        "status": interview.status.value,
        "overall_score": interview.overall_score,
        "has_recording": bool(interview.recording_path),
        "questions": [
            {
                "order_index": question.order_index,
                "question_text": question.question_text,
                "answer_transcript": question.answer_transcript,
                "score": question.score,
                "evaluation_details": question.evaluation_details,
            }
            for question in questions
        ],
    }


@router.post("/interview-sessions/{session_id}/recording-url")
async def create_interview_recording_url(
    db: db_dependency,
    user: recruiter_dependency,
    request: Request,
    session_id: int,
):
    _get_interview_recording_path(db, session_id)
    return {"url": _create_recording_url(request, "interview", session_id)}


@router.get("/interview-sessions/{session_id}/recording", name="stream_interview_recording")
async def get_interview_recording(
    db: db_dependency,
    request: Request,
    session_id: int,
    token: Annotated[str | None, Query()] = None,
    bearer_token: Annotated[str | None, Depends(recording_bearer)] = None,
):
    await _authorize_recording_access(bearer_token, token, "interview", session_id)
    recording_path = _get_interview_recording_path(db, session_id)
    return _stream_recording(recording_path, request.headers.get("range"))


@router.get("/coding-submissions/{submission_id}")
async def get_coding_submission(db: db_dependency, user: user_dependency, submission_id: int):
    row = (
        db.query(CodingSubmission, CodingTestInvite, Users, CodingQuestion)
        .join(CodingTestInvite, CodingTestInvite.id == CodingSubmission.invite_id)
        .join(Users, Users.id == CodingTestInvite.candidate_id)
        .join(CodingQuestion, CodingQuestion.id == CodingSubmission.question_id)
        .filter(CodingSubmission.id == submission_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding submission not found")

    submission, invite, candidate, question = row
    evaluation = evaluate_submission(
        question_id=submission.question_id,
        code=submission.code,
        language=submission.language,
        sample_only=False,
    )
    if evaluation["verdict"] == "evaluation_infrastructure_error":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Code evaluation infrastructure is unavailable",
        )
    test_cases = (
        db.query(TestCase)
        .filter(TestCase.question_id == submission.question_id)
        .order_by(TestCase.id)
        .all()
    )
    results = [
        {**result, "is_sample": test_case.is_sample}
        for result, test_case in zip(evaluation["results"], test_cases)
    ]
    question_statuses = _question_statuses(db, invite)
    return {
        "id": submission.id,
        "candidate": {"id": candidate.id, "name": candidate.name, "email": candidate.email},
        "invite_id": invite.id,
        "question": {"id": question.id, "title": question.title, "difficulty": question.difficulty.value},
        "code": submission.code,
        "language": submission.language,
        "verdict": evaluation["verdict"],
        "passed_cases": sum(1 for result in evaluation["results"] if result["passed"]),
        "total_cases": len(evaluation["results"]),
        "submitted_at": submission.submitted_at,
        "has_recording": invite.recording_path is not None,
        "question_statuses": question_statuses,
        "results": results,
    }


@router.post("/coding-test-invites/{invite_id}/recording-url")
async def create_coding_recording_url(
    db: db_dependency,
    user: user_dependency,
    request: Request,
    invite_id: int,
):
    _get_coding_recording_path(db, invite_id)
    return {"url": _create_recording_url(request, "coding", invite_id)}


@router.get("/coding-test-invites/{invite_id}/recording", name="stream_coding_recording")
async def get_coding_recording(
    db: db_dependency,
    request: Request,
    invite_id: int,
    token: Annotated[str | None, Query()] = None,
    bearer_token: Annotated[str | None, Depends(recording_bearer)] = None,
):
    await _authorize_recording_access(bearer_token, token, "coding", invite_id)
    recording_path = _get_coding_recording_path(db, invite_id)
    return _stream_recording(recording_path, request.headers.get("range"))


def _get_interview_recording_path(db: Session, session_id: int) -> Path:
    interview = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if interview is None or not interview.recording_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")

    video_root = Path("videos").resolve()
    try:
        recording_path = Path(interview.recording_path).resolve(strict=True)
        recording_path.relative_to(video_root)
    except (OSError, ValueError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")

    if not recording_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    return recording_path


def _get_coding_recording_path(db: Session, invite_id: int) -> Path:
    invite = db.query(CodingTestInvite).filter(CodingTestInvite.id == invite_id).first()
    if invite is None or not invite.recording_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    recording_path = Path(invite.recording_path)
    if not recording_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    return recording_path


def _create_recording_url(request: Request, recording_type: str, recording_id: int) -> str:
    secret = os.getenv("SECRET_KEY")
    if not secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Recording playback is unavailable")
    token = jwt.encode(
        {
            "purpose": "recording-playback",
            "recording_type": recording_type,
            "recording_id": recording_id,
            "exp": datetime.now(timezone.utc) + RECORDING_URL_TTL,
        },
        secret,
        algorithm=ALGORITHM,
    )
    route_name = "stream_interview_recording" if recording_type == "interview" else "stream_coding_recording"
    return str(request.url_for(route_name, **{"session_id" if recording_type == "interview" else "invite_id": recording_id}).include_query_params(token=token))


async def _authorize_recording_access(
    bearer_token: str | None,
    playback_token: str | None,
    recording_type: str,
    recording_id: int,
) -> None:
    if bearer_token:
        user = await get_current_user(bearer_token)
        await require_recruiter(user)
        return

    secret = os.getenv("SECRET_KEY")
    if not secret or not playback_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Recording access token is required")
    try:
        payload = jwt.decode(playback_token, secret, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired recording access token")
    if (
        payload.get("purpose") != "recording-playback"
        or payload.get("recording_type") != recording_type
        or payload.get("recording_id") != recording_id
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid recording access token")


def _stream_recording(recording_path: Path, range_header: str | None) -> Response:
    file_size = recording_path.stat().st_size
    headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
    }
    status_code = status.HTTP_200_OK
    start = 0
    end = file_size - 1

    if range_header:
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
        if not match or file_size == 0:
            return Response(
                status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                headers={**headers, "Content-Range": f"bytes */{file_size}"},
            )
        range_start, range_end = match.groups()
        if not range_start and not range_end:
            return Response(
                status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                headers={**headers, "Content-Range": f"bytes */{file_size}"},
            )
        if range_start:
            start = int(range_start)
            end = min(int(range_end), file_size - 1) if range_end else file_size - 1
        else:
            suffix_length = int(range_end)
            if suffix_length == 0:
                return Response(
                    status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                    headers={**headers, "Content-Range": f"bytes */{file_size}"},
                )
            start = max(file_size - suffix_length, 0)
        if start >= file_size or end < start:
            return Response(
                status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                headers={**headers, "Content-Range": f"bytes */{file_size}"},
            )
        status_code = status.HTTP_206_PARTIAL_CONTENT
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"

    content_length = end - start + 1
    headers["Content-Length"] = str(content_length)

    def iter_file():
        with recording_path.open("rb") as recording_file:
            recording_file.seek(start)
            remaining = content_length
            while remaining:
                chunk = recording_file.read(min(RECORDING_CHUNK_SIZE, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    return StreamingResponse(
        iter_file(),
        status_code=status_code,
        media_type="video/webm",
        headers=headers,
    )


def _candidate_overview(
    db: Session,
    application: Application,
    candidate: Users,
    profile: CandidateProfile | None,
    invites: list[tuple[CodingTestInvite, CodingTest]],
    interview: InterviewSession | None,
) -> dict:
    coding_tests = []
    for invite, test in invites:
        submissions = (
            db.query(CodingSubmission)
            .filter(CodingSubmission.invite_id == invite.id)
            .order_by(CodingSubmission.submitted_at.desc(), CodingSubmission.id.desc())
            .all()
        )
        latest_by_question: dict[int, CodingSubmission] = {}
        for submission in submissions:
            latest_by_question.setdefault(submission.question_id, submission)
        question_statuses = _question_statuses(db, invite)
        accepted_questions = sum(question["status"] == "accepted" for question in question_statuses)
        total_questions = len(question_statuses)
        coding_tests.append(
            {
                "test_id": test.id,
                "test_title": test.title,
                "invite_id": invite.id,
                "status": invite.status.value,
                "score": round(accepted_questions * 100 / total_questions) if total_questions else None,
                "passed_cases": accepted_questions if total_questions else None,
                "total_cases": total_questions if total_questions else None,
                "submission_ids": [submission.id for submission in latest_by_question.values()],
                "question_statuses": question_statuses,
            }
        )
    return {
        "application_id": application.id,
        "candidate_id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "phone": profile.phone if profile else None,
        "status": application.status,
        "applied_at": application.applied_at,
        "resume_score": application.resume_screening_score,
        "coding_tests": coding_tests,
        "interview_status": interview.status.value if interview is not None else None,
        "interview_score": interview.overall_score if interview is not None else None,
        "interview_session_id": interview.id if interview is not None else None,
    }


def _question_statuses(db: Session, invite: CodingTestInvite) -> list[dict]:
    questions = (
        db.query(CodingQuestion)
        .join(CodingTestQuestion, CodingTestQuestion.coding_question_id == CodingQuestion.id)
        .filter(CodingTestQuestion.coding_test_id == invite.coding_test_id)
        .order_by(CodingTestQuestion.id)
        .all()
    )
    submissions = (
        db.query(CodingSubmission)
        .filter(CodingSubmission.invite_id == invite.id)
        .order_by(CodingSubmission.submitted_at.desc(), CodingSubmission.id.desc())
        .all()
    )
    latest_by_question: dict[int, CodingSubmission] = {}
    for submission in submissions:
        latest_by_question.setdefault(submission.question_id, submission)

    return [
        {
            "id": question.id,
            "title": question.title,
            "status": latest_by_question[question.id].status.value if question.id in latest_by_question else "skipped",
            "submission_id": latest_by_question[question.id].id if question.id in latest_by_question else None,
        }
        for question in questions
    ]