from typing import List, Optional, Sequence

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import CodingQuestion, CodingTest, CodingTestQuestion, Job


class CodingTestRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, test_data: dict, question_ids: Sequence[int]) -> CodingTest:
        coding_test = CodingTest(**test_data)
        self.db.add(coding_test)
        self.db.flush()
        self._replace_questions(coding_test.id, question_ids)
        self.db.commit()
        self.db.refresh(coding_test)
        return coding_test

    def get_all(self) -> List[CodingTest]:
        return self.db.query(CodingTest).order_by(CodingTest.created_at.desc(), CodingTest.id.desc()).all()

    def get_by_id(self, test_id: int) -> Optional[CodingTest]:
        return self.db.query(CodingTest).filter(CodingTest.id == test_id).first()

    def get_questions(self, test_id: int) -> List[CodingQuestion]:
        return (
            self.db.query(CodingQuestion)
            .join(CodingTestQuestion, CodingTestQuestion.coding_question_id == CodingQuestion.id)
            .filter(CodingTestQuestion.coding_test_id == test_id)
            .order_by(CodingTestQuestion.id)
            .all()
        )

    def get_question_count(self, test_id: int) -> int:
        return (
            self.db.query(func.count(CodingTestQuestion.id))
            .filter(CodingTestQuestion.coding_test_id == test_id)
            .scalar()
            or 0
        )

    def get_job(self, job_id: int) -> Optional[Job]:
        return self.db.query(Job).filter(Job.id == job_id).first()

    def get_questions_by_ids(self, question_ids: Sequence[int]) -> List[CodingQuestion]:
        if not question_ids:
            return []
        return self.db.query(CodingQuestion).filter(CodingQuestion.id.in_(question_ids)).all()

    def update(self, coding_test: CodingTest, test_data: dict, question_ids: Optional[Sequence[int]]) -> CodingTest:
        for key, value in test_data.items():
            setattr(coding_test, key, value)
        if question_ids is not None:
            self._replace_questions(coding_test.id, question_ids)
        self.db.commit()
        self.db.refresh(coding_test)
        return coding_test

    def delete(self, coding_test: CodingTest) -> None:
        self.db.query(CodingTestQuestion).filter(
            CodingTestQuestion.coding_test_id == coding_test.id
        ).delete(synchronize_session=False)
        self.db.delete(coding_test)
        self.db.commit()

    def _replace_questions(self, test_id: int, question_ids: Sequence[int]) -> None:
        self.db.query(CodingTestQuestion).filter(
            CodingTestQuestion.coding_test_id == test_id
        ).delete(synchronize_session=False)
        self.db.add_all(
            [CodingTestQuestion(coding_test_id=test_id, coding_question_id=question_id) for question_id in question_ids]
        )
