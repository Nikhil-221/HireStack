from typing import List, Optional
from sqlalchemy.orm import Session
from ..models import Job

class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, job_data: dict) -> Job:
        new_job = Job(**job_data)
        self.db.add(new_job)
        self.db.commit()
        self.db.refresh(new_job)
        return new_job

    def get_all(self) -> List[Job]:
        return self.db.query(Job).all()

    def get_by_id(self, job_id: int) -> Optional[Job]:
        return self.db.query(Job).filter(Job.id == job_id).first()

    def update(self, job: Job, job_data: dict) -> Job:
        for key, value in job_data.items():
            setattr(job, key, value)
        self.db.commit()
        self.db.refresh(job)
        return job

    def update_status(self, job: Job, status: str) -> Job:
        job.status = status
        self.db.commit()
        self.db.refresh(job)
        return job

    def delete(self, job: Job) -> None:
        self.db.delete(job)
        self.db.commit()
