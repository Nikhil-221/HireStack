from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette import status

from ..database import SessionLocal
from ..schemas.coding import (
    CodingQuestionCreate,
    CodingQuestionUpdate,
    CodingQuestionOut,
    GenerateQuestionRequest,
    GenerateQuestionResponse,
    CodingTestCreate,
    CodingTestStatusUpdate,
    CodingTestOut,
    CodingTestListOut,
    InviteCandidatesRequest,
    InvitationOut,
    CandidateTestOut,
    CandidateTestDetailOut,
    CandidateQuestionOut,
    SampleTestCaseOut,
    RunCodeRequest,
    RunResultOut,
    SubmitCodeRequest,
    SubmissionOut,
)
from ..services.coding_service import CodingQuestionService, CodingTestService, CandidateCodingService
from .auth import require_recruiter, candidate_dependency


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
recruiter_dependency = Annotated[dict, Depends(require_recruiter)]

admin_router = APIRouter(prefix="/coding", tags=["coding"])
candidate_router = APIRouter(prefix="/candidate/coding-tests", tags=["coding-candidate"])


# --- Admin: question bank ---------------------------------------------

@admin_router.post("/questions/generate", status_code=status.HTTP_200_OK, response_model=GenerateQuestionResponse)
async def generate_question(user: recruiter_dependency, request: GenerateQuestionRequest):
    from ..ai_coding_service import generate_coding_question
    return generate_coding_question(
        job_title=request.job_title,
        topic=request.topic,
        difficulty=request.difficulty.value,
    )


@admin_router.post("/questions", status_code=status.HTTP_201_CREATED, response_model=CodingQuestionOut)
async def create_question(db: db_dependency, user: recruiter_dependency, payload: CodingQuestionCreate):
    return CodingQuestionService(db).create_question(payload)


@admin_router.get("/questions", status_code=status.HTTP_200_OK, response_model=List[CodingQuestionOut])
async def list_questions(db: db_dependency, user: recruiter_dependency, job_id: int | None = None):
    return CodingQuestionService(db).get_all(job_id)


@admin_router.get("/questions/{question_id}", status_code=status.HTTP_200_OK, response_model=CodingQuestionOut)
async def get_question(db: db_dependency, user: recruiter_dependency, question_id: int):
    return CodingQuestionService(db).get_question(question_id)


@admin_router.put("/questions/{question_id}", status_code=status.HTTP_200_OK, response_model=CodingQuestionOut)
async def update_question(db: db_dependency, user: recruiter_dependency, question_id: int, payload: CodingQuestionUpdate):
    return CodingQuestionService(db).update_question(question_id, payload)


@admin_router.delete("/questions/{question_id}", status_code=status.HTTP_200_OK)
async def delete_question(db: db_dependency, user: recruiter_dependency, question_id: int):
    CodingQuestionService(db).delete_question(question_id)
    return {"message": "Question deleted"}


# --- Admin: tests --------------------------------------------------------

@admin_router.post("/tests", status_code=status.HTTP_201_CREATED, response_model=CodingTestOut)
async def create_test(db: db_dependency, user: recruiter_dependency, payload: CodingTestCreate):
    service = CodingTestService(db)
    test = service.create_test(payload)
    return _test_out(service, test)


@admin_router.get("/tests", status_code=status.HTTP_200_OK, response_model=List[CodingTestListOut])
async def list_tests(db: db_dependency, user: recruiter_dependency, job_id: int | None = None):
    service = CodingTestService(db)
    tests = service.get_all(job_id)
    out = []
    for test in tests:
        out.append(
            CodingTestListOut(
                id=test.id,
                job_id=test.job_id,
                title=test.title,
                duration_minutes=test.duration_minutes,
                status=test.status,
                created_at=test.created_at,
                question_count=service.repository.count_questions(test.id),
                invitation_count=service.invitation_repository.count_for_test(test.id),
            )
        )
    return out


@admin_router.get("/tests/{test_id}", status_code=status.HTTP_200_OK, response_model=CodingTestOut)
async def get_test(db: db_dependency, user: recruiter_dependency, test_id: int):
    service = CodingTestService(db)
    test = service.get_test(test_id)
    return _test_out(service, test)


@admin_router.patch("/tests/{test_id}/status", status_code=status.HTTP_200_OK, response_model=CodingTestOut)
async def update_test_status(db: db_dependency, user: recruiter_dependency, test_id: int, payload: CodingTestStatusUpdate):
    service = CodingTestService(db)
    test = service.update_status(test_id, payload)
    return _test_out(service, test)


@admin_router.post("/tests/{test_id}/invite", status_code=status.HTTP_201_CREATED, response_model=List[InvitationOut])
async def invite_candidates(db: db_dependency, user: recruiter_dependency, test_id: int, payload: InviteCandidatesRequest):
    service = CodingTestService(db)
    invitations = service.invite_candidates(test_id, payload.candidate_ids)
    return [_invitation_out(inv, service.db) for inv in invitations]


@admin_router.get("/tests/{test_id}/invitations", status_code=status.HTTP_200_OK, response_model=List[InvitationOut])
async def list_invitations(db: db_dependency, user: recruiter_dependency, test_id: int):
    service = CodingTestService(db)
    rows = service.list_invitations(test_id)
    return [
        InvitationOut(
            id=inv.id,
            test_id=inv.test_id,
            candidate_id=inv.candidate_id,
            candidate_name=candidate.name if candidate else None,
            candidate_email=candidate.email if candidate else None,
            status=inv.status,
            invited_at=inv.invited_at,
            started_at=inv.started_at,
            submitted_at=inv.submitted_at,
            score=inv.score,
        )
        for inv, candidate in rows
    ]


def _test_out(service: CodingTestService, test) -> CodingTestOut:
    questions = service.get_questions(test.id)
    return CodingTestOut(
        id=test.id,
        job_id=test.job_id,
        title=test.title,
        duration_minutes=test.duration_minutes,
        status=test.status,
        created_at=test.created_at,
        questions=questions,
    )


def _invitation_out(invitation, db: Session) -> InvitationOut:
    from ..models import Users
    candidate = db.query(Users).filter(Users.id == invitation.candidate_id).first()
    return InvitationOut(
        id=invitation.id,
        test_id=invitation.test_id,
        candidate_id=invitation.candidate_id,
        candidate_name=candidate.name if candidate else None,
        candidate_email=candidate.email if candidate else None,
        status=invitation.status,
        invited_at=invitation.invited_at,
        started_at=invitation.started_at,
        submitted_at=invitation.submitted_at,
        score=invitation.score,
    )


# --- Candidate: taking a test -------------------------------------------

candidate_user_dependency = Annotated[dict, Depends(candidate_dependency)]


@candidate_router.get("", status_code=status.HTTP_200_OK, response_model=List[CandidateTestOut])
async def list_my_tests(db: db_dependency, user: candidate_user_dependency):
    service = CandidateCodingService(db)
    rows = service.list_my_tests(user["id"])
    return [
        CandidateTestOut(
            invitation_id=inv.id,
            test_id=test.id if test else inv.test_id,
            title=test.title if test else "Untitled test",
            duration_minutes=test.duration_minutes if test else 0,
            status=inv.status,
            started_at=inv.started_at,
            submitted_at=inv.submitted_at,
            score=inv.score,
            job_title=job.title if job else None,
        )
        for inv, test, job in rows
    ]


@candidate_router.get("/{invitation_id}", status_code=status.HTTP_200_OK, response_model=CandidateTestDetailOut)
async def get_my_test(db: db_dependency, user: candidate_user_dependency, invitation_id: int):
    service = CandidateCodingService(db)
    invitation, test, job, questions, submissions = service.get_test_detail(invitation_id, user["id"])
    question_out = []
    for q in questions:
        samples = [
            SampleTestCaseOut(id=tc.id, input=tc.input, expected_output=tc.expected_output)
            for tc in service.question_repository.get_test_cases(q.id)
            if tc.is_sample
        ]
        submission = submissions.get(q.id)
        question_out.append(
            CandidateQuestionOut(
                id=q.id,
                title=q.title,
                description=q.description,
                difficulty=q.difficulty,
                starter_code=q.starter_code,
                sample_test_cases=samples,
                submission_status=submission.status if submission else None,
                last_score=submission.score if submission else None,
            )
        )
    return CandidateTestDetailOut(
        invitation_id=invitation.id,
        test_id=test.id,
        title=test.title,
        duration_minutes=test.duration_minutes,
        status=invitation.status,
        started_at=invitation.started_at,
        submitted_at=invitation.submitted_at,
        score=invitation.score,
        job_title=job.title if job else None,
        questions=question_out,
    )


@candidate_router.post("/{invitation_id}/start", status_code=status.HTTP_200_OK, response_model=CandidateTestOut)
async def start_test(db: db_dependency, user: candidate_user_dependency, invitation_id: int):
    service = CandidateCodingService(db)
    invitation = service.start_test(invitation_id, user["id"])
    test = service.test_repository.get_by_id(invitation.test_id)
    return CandidateTestOut(
        invitation_id=invitation.id,
        test_id=test.id,
        title=test.title,
        duration_minutes=test.duration_minutes,
        status=invitation.status,
        started_at=invitation.started_at,
        submitted_at=invitation.submitted_at,
        score=invitation.score,
    )


@candidate_router.post(
    "/{invitation_id}/questions/{question_id}/run",
    status_code=status.HTTP_200_OK,
    response_model=RunResultOut,
)
async def run_code(db: db_dependency, user: candidate_user_dependency, invitation_id: int, question_id: int, payload: RunCodeRequest):
    service = CandidateCodingService(db)
    passed, total, cases = service.run_code(invitation_id, user["id"], question_id, payload.code)
    return RunResultOut(passed=passed, total=total, cases=cases)


@candidate_router.post(
    "/{invitation_id}/questions/{question_id}/submit",
    status_code=status.HTTP_200_OK,
    response_model=SubmissionOut,
)
async def submit_code(db: db_dependency, user: candidate_user_dependency, invitation_id: int, question_id: int, payload: SubmitCodeRequest):
    service = CandidateCodingService(db)
    return service.submit_code(invitation_id, user["id"], question_id, payload.code)


@candidate_router.post("/{invitation_id}/finish", status_code=status.HTTP_200_OK, response_model=CandidateTestOut)
async def finish_test(db: db_dependency, user: candidate_user_dependency, invitation_id: int):
    service = CandidateCodingService(db)
    invitation = service.finish_test(invitation_id, user["id"])
    test = service.test_repository.get_by_id(invitation.test_id)
    return CandidateTestOut(
        invitation_id=invitation.id,
        test_id=test.id,
        title=test.title,
        duration_minutes=test.duration_minutes,
        status=invitation.status,
        started_at=invitation.started_at,
        submitted_at=invitation.submitted_at,
        score=invitation.score,
    )
