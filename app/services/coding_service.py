from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from starlette import status
from fastapi import HTTPException

from ..models import Job, Users, CodingTest, TestInvitation
from ..repositories.coding_repository import (
    CodingQuestionRepository,
    CodingTestRepository,
    TestInvitationRepository,
    CodeSubmissionRepository,
)
from ..schemas.coding import (
    CodingQuestionCreate,
    CodingQuestionUpdate,
    CodingTestCreate,
    CodingTestStatusUpdate,
    GenerateQuestionRequest,
)
from ..ai_coding_service import generate_coding_question
from .. import code_execution_service as execution


class CodingQuestionService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = CodingQuestionRepository(db)

    def create_question(self, payload: CodingQuestionCreate, source: str = "Manual"):
        data = payload.model_dump(exclude={"test_cases"})
        data["difficulty"] = data["difficulty"].value if hasattr(data["difficulty"], "value") else data["difficulty"]
        data["source"] = source
        test_cases = [tc.model_dump() for tc in payload.test_cases]
        if not any(tc["is_sample"] for tc in test_cases):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one test case must be marked as a sample (visible to candidates)",
            )
        return self.repository.create(data, test_cases)

    def get_all(self, job_id: Optional[int] = None):
        return self.repository.get_all(job_id)

    def get_question(self, question_id: int):
        question = self.repository.get_by_id(question_id)
        if question is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        return question

    def update_question(self, question_id: int, payload: CodingQuestionUpdate):
        question = self.get_question(question_id)
        data = payload.model_dump(exclude={"test_cases"})
        data["difficulty"] = data["difficulty"].value if hasattr(data["difficulty"], "value") else data["difficulty"]
        test_cases = [tc.model_dump() for tc in payload.test_cases]
        if not any(tc["is_sample"] for tc in test_cases):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one test case must be marked as a sample (visible to candidates)",
            )
        return self.repository.update(question, data, test_cases)

    def delete_question(self, question_id: int):
        question = self.get_question(question_id)
        self.repository.delete(question)

    def generate_question(self, request: GenerateQuestionRequest):
        result = generate_coding_question(
            job_title=request.job_title,
            topic=request.topic,
            difficulty=request.difficulty.value,
        )
        return result


class CodingTestService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = CodingTestRepository(db)
        self.question_repository = CodingQuestionRepository(db)
        self.invitation_repository = TestInvitationRepository(db)

    def create_test(self, payload: CodingTestCreate) -> CodingTest:
        job = self.db.query(Job).filter(Job.id == payload.job_id).first()
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        if not payload.question_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one question")
        for question_id in payload.question_ids:
            if self.question_repository.get_by_id(question_id) is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Question {question_id} not found"
                )
        data = {
            "job_id": payload.job_id,
            "title": payload.title,
            "duration_minutes": payload.duration_minutes,
        }
        return self.repository.create(data, payload.question_ids)

    def get_all(self, job_id: Optional[int] = None) -> List[CodingTest]:
        return self.repository.get_all(job_id)

    def get_test(self, test_id: int) -> CodingTest:
        test = self.repository.get_by_id(test_id)
        if test is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")
        return test

    def get_questions(self, test_id: int):
        return self.repository.get_questions(test_id)

    def update_status(self, test_id: int, payload: CodingTestStatusUpdate) -> CodingTest:
        test = self.get_test(test_id)
        return self.repository.update_status(test, payload.status.value)

    def invite_candidates(self, test_id: int, candidate_ids: List[int]) -> List[TestInvitation]:
        test = self.get_test(test_id)
        invitations = []
        for candidate_id in candidate_ids:
            candidate = self.db.query(Users).filter(Users.id == candidate_id).first()
            if candidate is None:
                continue
            if self.invitation_repository.exists(test_id, candidate_id):
                continue
            invitations.append(self.invitation_repository.create(test_id, candidate_id))
        return invitations

    def list_invitations(self, test_id: int):
        self.get_test(test_id)
        rows = self.invitation_repository.get_for_test(test_id)
        out = []
        for invitation in rows:
            candidate = self.db.query(Users).filter(Users.id == invitation.candidate_id).first()
            out.append((invitation, candidate))
        return out


class CandidateCodingService:
    def __init__(self, db: Session):
        self.db = db
        self.invitation_repository = TestInvitationRepository(db)
        self.test_repository = CodingTestRepository(db)
        self.question_repository = CodingQuestionRepository(db)
        self.submission_repository = CodeSubmissionRepository(db)

    def _get_owned_invitation(self, invitation_id: int, candidate_id: int) -> TestInvitation:
        invitation = self.invitation_repository.get_by_id(invitation_id)
        if invitation is None or invitation.candidate_id != candidate_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
        return invitation

    def list_my_tests(self, candidate_id: int):
        rows = self.invitation_repository.get_for_candidate(candidate_id)
        out = []
        for invitation in rows:
            test = self.test_repository.get_by_id(invitation.test_id)
            job = self.db.query(Job).filter(Job.id == test.job_id).first() if test else None
            out.append((invitation, test, job))
        return out

    def get_test_detail(self, invitation_id: int, candidate_id: int):
        invitation = self._get_owned_invitation(invitation_id, candidate_id)
        test = self.test_repository.get_by_id(invitation.test_id)
        if test is None or test.status != "Published":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not available")
        job = self.db.query(Job).filter(Job.id == test.job_id).first()
        questions = self.test_repository.get_questions(test.id)
        submissions = {s.question_id: s for s in self.submission_repository.get_for_invitation(invitation.id)}
        return invitation, test, job, questions, submissions

    def start_test(self, invitation_id: int, candidate_id: int) -> TestInvitation:
        invitation = self._get_owned_invitation(invitation_id, candidate_id)
        if invitation.status == "Invited":
            invitation.status = "InProgress"
            invitation.started_at = datetime.now(timezone.utc)
            self.invitation_repository.save(invitation)
        return invitation

    def _assert_in_progress(self, invitation: TestInvitation):
        if invitation.status not in ("InProgress",):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start the test before submitting code",
            )

    def run_code(self, invitation_id: int, candidate_id: int, question_id: int, code: str):
        invitation = self._get_owned_invitation(invitation_id, candidate_id)
        self._assert_in_progress(invitation)
        question = self.question_repository.get_by_id(question_id)
        if question is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        sample_cases = [
            {"input": tc.input, "expected_output": tc.expected_output}
            for tc in self.question_repository.get_test_cases(question_id)
            if tc.is_sample
        ]
        results = execution.run_against_cases(code, sample_cases, timeout_seconds=question.time_limit_seconds)
        passed, total, _ = execution.score_results(results)
        return passed, total, [
            {"input": r.input, "expected": r.expected, "actual": r.actual, "passed": r.passed, "error": r.error}
            for r in results
        ]

    def submit_code(self, invitation_id: int, candidate_id: int, question_id: int, code: str):
        invitation = self._get_owned_invitation(invitation_id, candidate_id)
        self._assert_in_progress(invitation)
        question = self.question_repository.get_by_id(question_id)
        if question is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        all_cases = [
            {"input": tc.input, "expected_output": tc.expected_output}
            for tc in self.question_repository.get_test_cases(question_id)
        ]
        results = execution.run_against_cases(code, all_cases, timeout_seconds=question.time_limit_seconds)
        passed, total, score = execution.score_results(results)
        run_output = execution.summarize_failures(results)
        submission = self.submission_repository.upsert(
            invitation.id,
            question_id,
            {
                "code": code,
                "passed_count": passed,
                "total_count": total,
                "score": score,
                "status": "Evaluated",
                "run_output": run_output,
            },
        )
        return submission

    def finish_test(self, invitation_id: int, candidate_id: int) -> TestInvitation:
        invitation = self._get_owned_invitation(invitation_id, candidate_id)
        self._assert_in_progress(invitation)
        submissions = self.submission_repository.get_for_invitation(invitation.id)
        overall = round(sum(s.score for s in submissions) / len(submissions), 2) if submissions else 0.0
        invitation.status = "Evaluated"
        invitation.submitted_at = datetime.now(timezone.utc)
        invitation.score = overall
        return self.invitation_repository.save(invitation)
