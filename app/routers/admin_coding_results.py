from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
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
    Job,
    TestCase,
    Users,
)
from ..piston_service import evaluate_submission
from .auth import require_recruiter


router = APIRouter(prefix="/admin", tags=["admin coding results"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(require_recruiter)]


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

    return {
        "job": {"id": job.id, "title": job.title},
        "candidates": [
            _candidate_overview(db, application, candidate, profile, invites_by_candidate.get(candidate.id, []))
            for application, candidate, profile in applications
        ],
    }


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
        "results": results,
    }


def _candidate_overview(
    db: Session,
    application: Application,
    candidate: Users,
    profile: CandidateProfile | None,
    invites: list[tuple[CodingTestInvite, CodingTest]],
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
        passed = sum(submission.passed_cases for submission in latest_by_question.values())
        total = sum(submission.total_cases for submission in latest_by_question.values())
        coding_tests.append(
            {
                "test_id": test.id,
                "test_title": test.title,
                "invite_id": invite.id,
                "status": invite.status.value,
                "score": round(passed * 100 / total) if total else None,
                "passed_cases": passed if total else None,
                "total_cases": total if total else None,
                "submission_ids": [submission.id for submission in latest_by_question.values()],
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
        "interview_score": application.interview_score,
    }