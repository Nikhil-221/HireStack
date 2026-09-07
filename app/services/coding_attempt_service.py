from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette import status

from ..models import (
    CodingQuestion,
    CodingSubmission,
    CodingSubmissionStatus,
    CodingTest,
    CodingTestInvite,
    CodingTestInviteStatus,
    CodingTestQuestion,
    TestCase,
)
from ..piston_service import evaluate_submission


class CodingAttemptService:
    def __init__(self, db: Session):
        self.db = db

    def get_attempt(self, token: str, candidate_id: int) -> dict[str, Any]:
        invite, coding_test = self._get_active_invite(token, candidate_id)
        now = datetime.now(timezone.utc)
        if invite.opened_at is None:
            invite.opened_at = now
            self.db.commit()
            self.db.refresh(invite)

        questions = self._get_questions(coding_test.id)
        submissions = self._latest_submissions(invite.id)
        return {
            "title": coding_test.title,
            "duration_minutes": coding_test.duration_minutes,
            "status": invite.status.value,
            "opened_at": invite.opened_at,
            "server_time": now,
            "expires_at": invite.expires_at,
            "questions": [self._question_out(question, submissions.get(question.id)) for question in questions],
        }

    def run(self, token: str, candidate_id: int, question_id: int, code: str, language: str) -> dict:
        invite, coding_test = self._get_active_invite(token, candidate_id)
        self._get_question_for_test(coding_test.id, question_id)
        self._mark_in_progress(invite)
        self.db.commit()
        return evaluate_submission(question_id, code, language, sample_only=True)

    def end(self, token: str, candidate_id: int) -> dict:
        invite = (
            self.db.query(CodingTestInvite)
            .filter(
                CodingTestInvite.token == token,
                CodingTestInvite.candidate_id == candidate_id,
            )
            .first()
        )
        if invite is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test invite not found")
        if invite.opened_at is None:
            invite.opened_at = datetime.now(timezone.utc)
        invite.status = CodingTestInviteStatus.COMPLETED
        self.db.commit()
        return {"status": invite.status.value}

    def submit(self, token: str, candidate_id: int, question_id: int, code: str, language: str) -> dict:
        invite, coding_test = self._get_active_invite(token, candidate_id)
        self._get_question_for_test(coding_test.id, question_id)
        evaluation = evaluate_submission(question_id, code, language, sample_only=False)
        if evaluation["verdict"] == "evaluation_infrastructure_error":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Code evaluation infrastructure is unavailable",
            )

        submission_status = CodingSubmissionStatus(evaluation["verdict"])
        passed_cases = sum(1 for result in evaluation["results"] if result["passed"])
        submission = CodingSubmission(
            invite_id=invite.id,
            question_id=question_id,
            code=code,
            language=language,
            status=submission_status,
            passed_cases=passed_cases,
            total_cases=len(evaluation["results"]),
        )
        self.db.add(submission)
        self._mark_in_progress(invite)
        self.db.flush()

        question_ids = {question.id for question in self._get_questions(coding_test.id)}
        submitted_question_ids = {
            question_id_value
            for (question_id_value,) in self.db.query(CodingSubmission.question_id)
            .filter(CodingSubmission.invite_id == invite.id)
            .distinct()
            .all()
        }
        if question_ids and question_ids.issubset(submitted_question_ids):
            invite.status = CodingTestInviteStatus.COMPLETED

        self.db.commit()
        self.db.refresh(submission)
        return {
            **evaluation,
            "submission_id": submission.id,
            "status": invite.status.value,
        }

    def _get_active_invite(self, token: str, candidate_id: int) -> tuple[CodingTestInvite, CodingTest]:
        invite_and_test = (
            self.db.query(CodingTestInvite, CodingTest)
            .join(CodingTest, CodingTest.id == CodingTestInvite.coding_test_id)
            .filter(
                CodingTestInvite.token == token,
                CodingTestInvite.candidate_id == candidate_id,
            )
            .first()
        )
        if invite_and_test is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test invite not found")

        invite, coding_test = invite_and_test
        now = datetime.now(timezone.utc)
        expires_at = invite.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="This test invite has expired")
        if invite.status == CodingTestInviteStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This test has already been completed")
        return invite, coding_test

    def _get_questions(self, test_id: int) -> list[CodingQuestion]:
        return (
            self.db.query(CodingQuestion)
            .join(CodingTestQuestion, CodingTestQuestion.coding_question_id == CodingQuestion.id)
            .filter(CodingTestQuestion.coding_test_id == test_id)
            .order_by(CodingTestQuestion.id)
            .all()
        )

    def _get_question_for_test(self, test_id: int, question_id: int) -> CodingQuestion:
        question = (
            self.db.query(CodingQuestion)
            .join(CodingTestQuestion, CodingTestQuestion.coding_question_id == CodingQuestion.id)
            .filter(
                CodingTestQuestion.coding_test_id == test_id,
                CodingQuestion.id == question_id,
            )
            .first()
        )
        if question is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question is not part of this test")
        return question

    def _latest_submissions(self, invite_id: int) -> dict[int, CodingSubmission]:
        submissions = (
            self.db.query(CodingSubmission)
            .filter(CodingSubmission.invite_id == invite_id)
            .order_by(CodingSubmission.submitted_at.desc(), CodingSubmission.id.desc())
            .all()
        )
        return {submission.question_id: submission for submission in submissions}

    def _question_out(self, question: CodingQuestion, submission: CodingSubmission | None) -> dict:
        sample_cases = (
            self.db.query(TestCase)
            .filter(TestCase.question_id == question.id, TestCase.is_sample.is_(True))
            .order_by(TestCase.id)
            .all()
        )
        return {
            "id": question.id,
            "title": question.title,
            "description": question.description,
            "difficulty": question.difficulty.value,
            "starter_code": question.starter_code,
            "test_cases": [
                {"input": case.input, "expected_output": case.expected_output}
                for case in sample_cases
            ],
            "attempted": submission is not None,
            "submission_status": submission.status.value if submission else None,
            "last_code": submission.code if submission else None,
            "last_language": submission.language if submission else None,
        }

    def _mark_in_progress(self, invite: CodingTestInvite) -> None:
        if invite.status == CodingTestInviteStatus.NOT_STARTED:
            invite.status = CodingTestInviteStatus.IN_PROGRESS