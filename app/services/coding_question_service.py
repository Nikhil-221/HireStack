from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette import status

from ..ai_coding_question_service import generate_coding_questions
from ..models import CodingQuestion, CodingQuestionDifficulty, Job
from ..repositories.coding_question_repository import CodingQuestionRepository
from ..schemas.coding_question import CodingQuestionCreate, CodingQuestionUpdate


class CodingQuestionService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = CodingQuestionRepository(db)

    def create_question(self, payload: CodingQuestionCreate) -> dict:
        self._validate_job(payload.job_id)
        question = self.repository.create(
            self._question_data(payload),
            [test_case.model_dump() for test_case in payload.test_cases],
        )
        return self._serialize(question)

    def generate_questions(self, count: int) -> dict:
        return {"questions": generate_coding_questions(count)}

    def list_questions(
        self,
        job_id: Optional[int] = None,
        difficulty: Optional[CodingQuestionDifficulty] = None,
    ) -> List[dict]:
        return [self._serialize(question) for question in self.repository.get_all(job_id, difficulty)]

    def get_question(self, question_id: int) -> dict:
        question = self._get_question_or_404(question_id)
        return self._serialize(question)

    def update_question(self, question_id: int, payload: CodingQuestionUpdate) -> dict:
        question = self._get_question_or_404(question_id)
        data = payload.model_dump(exclude_unset=True, exclude={"test_cases"})
        if "job_id" in data:
            self._validate_job(data["job_id"])
        test_cases = payload.test_cases
        self.repository.update(
            question,
            data,
            None if test_cases is None else [test_case.model_dump() for test_case in test_cases],
        )
        return self._serialize(question)

    def delete_question(self, question_id: int) -> None:
        question = self._get_question_or_404(question_id)
        self.repository.delete(question)

    def _get_question_or_404(self, question_id: int) -> CodingQuestion:
        question = self.repository.get_by_id(question_id)
        if question is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coding question not found",
            )
        return question

    def _validate_job(self, job_id: Optional[int]) -> None:
        if job_id is not None and self.db.query(Job.id).filter(Job.id == job_id).scalar() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found",
            )

    @staticmethod
    def _question_data(payload: CodingQuestionCreate) -> dict:
        return payload.model_dump(exclude={"test_cases"})

    def _serialize(self, question: CodingQuestion) -> dict:
        return {
            "id": question.id,
            "title": question.title,
            "description": question.description,
            "difficulty": question.difficulty,
            "job_id": question.job_id,
            "job_title": self.repository.get_job_title(question.job_id),
            "starter_code": question.starter_code,
            "created_at": question.created_at,
            "test_cases": self.repository.get_test_cases(question.id),
        }
