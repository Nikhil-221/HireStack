from typing import List, Optional, Sequence

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import CodingQuestion, CodingQuestionDifficulty, Job, TestCase


class CodingQuestionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, question_data: dict, test_cases: Sequence[dict]) -> CodingQuestion:
        question = CodingQuestion(**question_data)
        self.db.add(question)
        self.db.flush()
        self._replace_test_cases(question.id, test_cases)
        self.db.commit()
        self.db.refresh(question)
        return question

    def get_all(
        self,
        job_id: Optional[int] = None,
        difficulty: Optional[CodingQuestionDifficulty] = None,
    ) -> List[CodingQuestion]:
        query = self.db.query(CodingQuestion)
        if job_id is not None:
            query = query.filter(or_(CodingQuestion.job_id == job_id, CodingQuestion.job_id.is_(None)))
        if difficulty is not None:
            query = query.filter(CodingQuestion.difficulty == difficulty)
        return query.order_by(CodingQuestion.created_at.desc(), CodingQuestion.id.desc()).all()

    def get_by_id(self, question_id: int) -> Optional[CodingQuestion]:
        return self.db.query(CodingQuestion).filter(CodingQuestion.id == question_id).first()

    def get_test_cases(self, question_id: int) -> List[TestCase]:
        return (
            self.db.query(TestCase)
            .filter(TestCase.question_id == question_id)
            .order_by(TestCase.id)
            .all()
        )

    def get_job_title(self, job_id: Optional[int]) -> Optional[str]:
        if job_id is None:
            return None
        return self.db.query(Job.title).filter(Job.id == job_id).scalar()

    def update(
        self,
        question: CodingQuestion,
        question_data: dict,
        test_cases: Optional[Sequence[dict]],
    ) -> CodingQuestion:
        for key, value in question_data.items():
            setattr(question, key, value)
        if test_cases is not None:
            self._replace_test_cases(question.id, test_cases)
        self.db.commit()
        self.db.refresh(question)
        return question

    def delete(self, question: CodingQuestion) -> None:
        self.db.query(TestCase).filter(TestCase.question_id == question.id).delete(
            synchronize_session=False
        )
        self.db.delete(question)
        self.db.commit()

    def _replace_test_cases(self, question_id: int, test_cases: Sequence[dict]) -> None:
        self.db.query(TestCase).filter(TestCase.question_id == question_id).delete(
            synchronize_session=False
        )
        self.db.add_all(
            [TestCase(question_id=question_id, **test_case) for test_case in test_cases]
        )
