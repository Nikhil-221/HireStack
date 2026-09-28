from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette import status

from ..ai_interview_service import (
    InterviewAIError,
    generate_interview_questions,
    score_interview_answer,
)
from ..models import (
    Application,
    InterviewQuestion,
    InterviewSession,
    InterviewSessionStatus,
    Job,
    Notification,
    NotificationType,
    Users,
)


class InterviewService:
    def __init__(self, db: Session):
        self.db = db

    def create_invite(self, job_id: int, candidate_id: int) -> dict:
        now = datetime.now(timezone.utc)
        job = self.db.query(Job).filter(Job.id == job_id).with_for_update().first()
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

        candidate = (
            self.db.query(Users)
            .filter(Users.id == candidate_id, Users.role.ilike("candidate"))
            .first()
        )
        if candidate is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

        application = (
            self.db.query(Application.id)
            .filter(Application.job_id == job_id, Application.candidate_id == candidate_id)
            .first()
        )
        if application is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Candidate has not applied to this job",
            )

        active_invite = (
            self.db.query(InterviewSession.id)
            .filter(
                InterviewSession.job_id == job_id,
                InterviewSession.candidate_id == candidate_id,
                InterviewSession.status.in_(
                    [InterviewSessionStatus.NOT_STARTED, InterviewSessionStatus.IN_PROGRESS]
                ),
                InterviewSession.expires_at > now,
            )
            .first()
        )
        if active_invite is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An active interview invitation already exists for this candidate and job",
            )

        token = str(uuid4())
        invite = InterviewSession(
            job_id=job.id,
            candidate_id=candidate.id,
            token=token,
            status=InterviewSessionStatus.NOT_STARTED,
            expires_at=now + timedelta(days=7),
        )
        notification = Notification(
            candidate_id=candidate.id,
            type=NotificationType.INTERVIEW,
            title=f"Interview invitation for {job.title}",
            message=f"You have been invited to interview for {job.title}.",
            related_token=token,
        )
        self.db.add_all([invite, notification])
        self.db.commit()
        self.db.refresh(invite)
        return {
            "id": invite.id,
            "job_id": invite.job_id,
            "candidate_id": invite.candidate_id,
            "token": invite.token,
            "status": invite.status.value,
            "expires_at": invite.expires_at,
            "created_at": invite.created_at,
        }

    def open_interview(self, token: str, candidate_id: int) -> dict:
        interview = self._get_interview(token, candidate_id, lock=True)
        self._ensure_active(interview)

        questions = self._get_questions(interview.id)
        if not questions:
            job = self.db.query(Job).filter(Job.id == interview.job_id).first()
            if job is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
            try:
                generated = generate_interview_questions(
                    {
                        "title": job.title,
                        "description": job.description or "",
                        "skills": (job.required_skills or []) + (job.preferred_skills or []),
                    }
                )
            except InterviewAIError as exc:
                self.db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=str(exc),
                ) from exc

            now = datetime.now(timezone.utc)
            interview.opened_at = interview.opened_at or now
            interview.status = InterviewSessionStatus.IN_PROGRESS
            questions = [
                InterviewQuestion(
                    session_id=interview.id,
                    order_index=question["order_index"],
                    question_text=question["question_text"],
                )
                for question in generated
            ]
            self.db.add_all(questions)
            self.db.commit()
            for question in questions:
                self.db.refresh(question)
        else:
            if len(questions) != 2 or [question.order_index for question in questions] != [0, 1]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Interview questions are incomplete",
                )
            if interview.opened_at is None or interview.status == InterviewSessionStatus.NOT_STARTED:
                interview.opened_at = interview.opened_at or datetime.now(timezone.utc)
                interview.status = InterviewSessionStatus.IN_PROGRESS
                self.db.commit()

        return self._session_out(interview, questions)

    def submit_answer(
        self,
        token: str,
        candidate_id: int,
        question_id: int,
        transcript: str,
    ) -> dict:
        interview = self._get_interview(token, candidate_id, lock=True)
        self._ensure_active(interview)
        if interview.status != InterviewSessionStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Open the interview before submitting answers",
            )

        question = (
            self.db.query(InterviewQuestion)
            .filter(
                InterviewQuestion.id == question_id,
                InterviewQuestion.session_id == interview.id,
            )
            .with_for_update()
            .first()
        )
        if question is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview question not found")
        if question.answer_transcript is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An answer has already been submitted for this question",
            )

        try:
            evaluation = score_interview_answer(question.question_text, transcript)
        except InterviewAIError as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

        question.answer_transcript = transcript
        question.score = float(evaluation["score"])
        question.evaluation_details = evaluation["evaluation_details"]
        self.db.commit()
        return {"question_id": question.id, "saved": True}

    def end_interview(self, token: str, candidate_id: int) -> dict:
        interview = self._get_interview(token, candidate_id, lock=True)
        self._ensure_active(interview)
        if interview.status != InterviewSessionStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Open the interview before ending it",
            )

        questions = self._get_questions(interview.id)
        if len(questions) != 2 or [question.order_index for question in questions] != [0, 1]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Interview questions are incomplete",
            )
        interview.overall_score = sum(question.score or 0.0 for question in questions) / 2
        interview.status = InterviewSessionStatus.COMPLETED
        self.db.commit()
        return {"status": interview.status.value}

    def get_recording_session(self, token: str, candidate_id: int) -> InterviewSession:
        interview = self._get_interview(token, candidate_id, lock=True)
        if interview.recording_path is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A recording has already been uploaded for this interview",
            )
        return interview

    def get_job_interview_status(self, job_id: int, candidate_id: int) -> dict:
        application = (
            self.db.query(Application.id)
            .filter(Application.job_id == job_id, Application.candidate_id == candidate_id)
            .first()
        )
        if application is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Applicant not found for this job")

        interview = (
            self.db.query(InterviewSession)
            .filter(
                InterviewSession.job_id == job_id,
                InterviewSession.candidate_id == candidate_id,
            )
            .order_by(InterviewSession.created_at.desc(), InterviewSession.id.desc())
            .first()
        )
        return {
            "status": interview.status.value if interview is not None else None,
            "interview_score": interview.overall_score if interview is not None else None,
            "interview_session_id": interview.id if interview is not None else None,
        }

    def _get_interview(self, token: str, candidate_id: int, lock: bool = False) -> InterviewSession:
        query = self.db.query(InterviewSession).filter(
            InterviewSession.token == token,
            InterviewSession.candidate_id == candidate_id,
        )
        if lock:
            query = query.with_for_update()
        interview = query.first()
        if interview is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview invitation not found")
        return interview

    def _ensure_active(self, interview: InterviewSession) -> None:
        if interview.status == InterviewSessionStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This interview is already completed")
        expires_at = interview.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="This interview invitation has expired")

    def _get_questions(self, interview_id: int) -> list[InterviewQuestion]:
        return (
            self.db.query(InterviewQuestion)
            .filter(InterviewQuestion.session_id == interview_id)
            .order_by(InterviewQuestion.order_index)
            .all()
        )

    def _session_out(self, interview: InterviewSession, questions: list[InterviewQuestion]) -> dict:
        return {
            "status": interview.status.value,
            "opened_at": interview.opened_at,
            "expires_at": interview.expires_at,
            "questions": [
                {
                    "id": question.id,
                    "order_index": question.order_index,
                    "question_text": question.question_text,
                    "answer_transcript": question.answer_transcript,
                }
                for question in questions
            ],
        }