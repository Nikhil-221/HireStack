from typing import List, Optional
from sqlalchemy.orm import Session
from ..models import (
    CodingQuestion,
    CodingTestCase,
    CodingTest,
    CodingTestQuestion,
    TestInvitation,
    CodeSubmission,
)


class CodingQuestionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: dict, test_cases: List[dict]) -> CodingQuestion:
        question = CodingQuestion(**data)
        self.db.add(question)
        self.db.flush()
        for case in test_cases:
            self.db.add(CodingTestCase(question_id=question.id, **case))
        self.db.commit()
        self.db.refresh(question)
        return question

    def get_all(self, job_id: Optional[int] = None) -> List[CodingQuestion]:
        query = self.db.query(CodingQuestion)
        if job_id is not None:
            query = query.filter(CodingQuestion.job_id == job_id)
        return query.order_by(CodingQuestion.created_at.desc()).all()

    def get_by_id(self, question_id: int) -> Optional[CodingQuestion]:
        return self.db.query(CodingQuestion).filter(CodingQuestion.id == question_id).first()

    def get_test_cases(self, question_id: int) -> List[CodingTestCase]:
        return self.db.query(CodingTestCase).filter(CodingTestCase.question_id == question_id).all()

    def update(self, question: CodingQuestion, data: dict, test_cases: List[dict]) -> CodingQuestion:
        for key, value in data.items():
            setattr(question, key, value)
        self.db.query(CodingTestCase).filter(CodingTestCase.question_id == question.id).delete()
        for case in test_cases:
            self.db.add(CodingTestCase(question_id=question.id, **case))
        self.db.commit()
        self.db.refresh(question)
        return question

    def delete(self, question: CodingQuestion) -> None:
        self.db.query(CodingTestCase).filter(CodingTestCase.question_id == question.id).delete()
        self.db.delete(question)
        self.db.commit()


class CodingTestRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: dict, question_ids: List[int]) -> CodingTest:
        test = CodingTest(**data)
        self.db.add(test)
        self.db.flush()
        for index, question_id in enumerate(question_ids):
            self.db.add(CodingTestQuestion(test_id=test.id, question_id=question_id, order_index=index))
        self.db.commit()
        self.db.refresh(test)
        return test

    def get_all(self, job_id: Optional[int] = None) -> List[CodingTest]:
        query = self.db.query(CodingTest)
        if job_id is not None:
            query = query.filter(CodingTest.job_id == job_id)
        return query.order_by(CodingTest.created_at.desc()).all()

    def get_by_id(self, test_id: int) -> Optional[CodingTest]:
        return self.db.query(CodingTest).filter(CodingTest.id == test_id).first()

    def get_questions(self, test_id: int) -> List[CodingQuestion]:
        return (
            self.db.query(CodingQuestion)
            .join(CodingTestQuestion, CodingTestQuestion.question_id == CodingQuestion.id)
            .filter(CodingTestQuestion.test_id == test_id)
            .order_by(CodingTestQuestion.order_index)
            .all()
        )

    def update_status(self, test: CodingTest, status: str) -> CodingTest:
        test.status = status
        self.db.commit()
        self.db.refresh(test)
        return test

    def count_questions(self, test_id: int) -> int:
        return (
            self.db.query(CodingTestQuestion)
            .filter(CodingTestQuestion.test_id == test_id)
            .count()
        )


class TestInvitationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, test_id: int, candidate_id: int) -> TestInvitation:
        invitation = TestInvitation(test_id=test_id, candidate_id=candidate_id)
        self.db.add(invitation)
        self.db.commit()
        self.db.refresh(invitation)
        return invitation

    def exists(self, test_id: int, candidate_id: int) -> bool:
        return (
            self.db.query(TestInvitation)
            .filter(TestInvitation.test_id == test_id, TestInvitation.candidate_id == candidate_id)
            .first()
            is not None
        )

    def get_by_id(self, invitation_id: int) -> Optional[TestInvitation]:
        return self.db.query(TestInvitation).filter(TestInvitation.id == invitation_id).first()

    def get_for_test(self, test_id: int) -> List[TestInvitation]:
        return self.db.query(TestInvitation).filter(TestInvitation.test_id == test_id).all()

    def get_for_candidate(self, candidate_id: int) -> List[TestInvitation]:
        return (
            self.db.query(TestInvitation)
            .filter(TestInvitation.candidate_id == candidate_id)
            .order_by(TestInvitation.invited_at.desc())
            .all()
        )

    def count_for_test(self, test_id: int) -> int:
        return self.db.query(TestInvitation).filter(TestInvitation.test_id == test_id).count()

    def save(self, invitation: TestInvitation) -> TestInvitation:
        self.db.commit()
        self.db.refresh(invitation)
        return invitation


class CodeSubmissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, invitation_id: int, question_id: int) -> Optional[CodeSubmission]:
        return (
            self.db.query(CodeSubmission)
            .filter(CodeSubmission.invitation_id == invitation_id, CodeSubmission.question_id == question_id)
            .first()
        )

    def get_for_invitation(self, invitation_id: int) -> List[CodeSubmission]:
        return self.db.query(CodeSubmission).filter(CodeSubmission.invitation_id == invitation_id).all()

    def upsert(self, invitation_id: int, question_id: int, data: dict) -> CodeSubmission:
        submission = self.get(invitation_id, question_id)
        if submission is None:
            submission = CodeSubmission(invitation_id=invitation_id, question_id=question_id, **data)
            self.db.add(submission)
        else:
            for key, value in data.items():
                setattr(submission, key, value)
        self.db.commit()
        self.db.refresh(submission)
        return submission
