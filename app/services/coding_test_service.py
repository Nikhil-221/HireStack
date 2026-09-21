from typing import List, Optional, Sequence

from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette import status

from ..models import CodingQuestion, CodingTest
from ..repositories.coding_test_repository import CodingTestRepository
from ..schemas.coding_test import CodingTestCreate, CodingTestUpdate


class CodingTestService:
    def __init__(self, db: Session):
        self.repository = CodingTestRepository(db)

    def create_test(self, payload: CodingTestCreate) -> dict:
        job = self._validate_question_selection(payload.job_id, payload.question_ids)
        coding_test = self.repository.create(
            {"job_id": job.id if job else None, "title": payload.title, "duration_minutes": payload.duration_minutes},
            payload.question_ids,
        )
        return self._serialize(coding_test)

    def list_tests(self) -> List[dict]:
        return [self._serialize(test, include_questions=False) for test in self.repository.get_all()]

    def get_test(self, test_id: int) -> dict:
        return self._serialize(self._get_test_or_404(test_id))

    def update_test(self, test_id: int, payload: CodingTestUpdate) -> dict:
        coding_test = self._get_test_or_404(test_id)
        data = payload.model_dump(exclude_unset=True, exclude={"question_ids"})
        question_ids = payload.question_ids
        if question_ids is not None:
            self._validate_question_selection(coding_test.job_id, question_ids)
        self.repository.update(coding_test, data, question_ids)
        return self._serialize(coding_test)

    def delete_test(self, test_id: int) -> None:
        self.repository.delete(self._get_test_or_404(test_id))

    def _get_test_or_404(self, test_id: int) -> CodingTest:
        coding_test = self.repository.get_by_id(test_id)
        if coding_test is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding test not found")
        return coding_test

    def _validate_question_selection(self, job_id: Optional[int], question_ids: Sequence[int]):
        job = self.repository.get_job(job_id) if job_id is not None else None
        if job_id is not None and job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        if len(set(question_ids)) != len(question_ids):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Question IDs must be unique")
        questions = self.repository.get_questions_by_ids(question_ids)
        questions_by_id = {question.id: question for question in questions}
        missing_ids = [question_id for question_id in question_ids if question_id not in questions_by_id]
        if missing_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question not found: {missing_ids[0]}")
        cross_job = [question.id for question in questions if job_id is not None and question.job_id not in (None, job_id)]
        if cross_job:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Questions must belong to the selected job or be applicable to all jobs",
            )
        return job

    def _serialize(self, coding_test: CodingTest, include_questions: bool = True) -> dict:
        questions = self.repository.get_questions(coding_test.id)
        return {
            "id": coding_test.id,
            "job_id": coding_test.job_id,
            "job_title": self.repository.get_job(coding_test.job_id).title if coding_test.job_id is not None else None,
            "title": coding_test.title,
            "duration_minutes": coding_test.duration_minutes,
            "question_count": len(questions),
            "created_at": coding_test.created_at,
            "questions": questions if include_questions else [],
        }
