from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette import status

from ..models import (
    CodingTest,
    CodingTestInvite,
    CodingTestInviteStatus,
    Job,
    Notification,
    NotificationType,
    Users,
)


class CodingInviteService:
    def __init__(self, db: Session):
        self.db = db

    def create_invite(self, test_id: int, candidate_id: int) -> CodingTestInvite:
        coding_test = self.db.query(CodingTest).filter(CodingTest.id == test_id).first()
        if coding_test is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding test not found")

        candidate = (
            self.db.query(Users)
            .filter(Users.id == candidate_id, Users.role.ilike("candidate"))
            .first()
        )
        if candidate is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

        job = self.db.query(Job).filter(Job.id == coding_test.job_id).first()
        token = str(uuid4())
        now = datetime.now(timezone.utc)
        invite = CodingTestInvite(
            coding_test_id=coding_test.id,
            candidate_id=candidate.id,
            token=token,
            status=CodingTestInviteStatus.NOT_STARTED,
            expires_at=now + timedelta(days=7),
        )
        job_title = job.title if job is not None else "all jobs"
        notification = Notification(
            candidate_id=candidate.id,
            type=NotificationType.CODING_TEST,
            title=f"Coding round invitation for {job_title}",
            message=f"You have been invited to complete the coding test \"{coding_test.title}\".",
            related_token=token,
        )
        self.db.add_all([invite, notification])
        self.db.commit()
        self.db.refresh(invite)
        return invite

    def list_notifications(self, candidate_id: int):
        return (
            self.db.query(Notification)
            .filter(Notification.candidate_id == candidate_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .all()
        )

    def mark_notification_read(self, notification_id: int, candidate_id: int) -> Notification:
        notification = (
            self.db.query(Notification)
            .filter(Notification.id == notification_id, Notification.candidate_id == candidate_id)
            .first()
        )
        if notification is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        notification.is_read = True
        self.db.commit()
        self.db.refresh(notification)
        return notification
