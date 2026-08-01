from typing import List
from sqlalchemy.orm import Session
from starlette import status
from fastapi import HTTPException
from ..models import Job
from ..repositories.job_repository import JobRepository
from ..schemas.job import JobCreate, JobUpdate, JobStatusUpdate, GenerateJDRequest
from ..ai_jd_service import generate_job_description

class JobService:
    def __init__(self, db: Session):
        self.repository = JobRepository(db)

    def create_job(self, job: JobCreate) -> Job:
        return self.repository.create(job.model_dump())

    def get_all_jobs(self) -> List[Job]:
        return self.repository.get_all()

    def get_job(self, job_id: int) -> Job:
        job = self.repository.get_by_id(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        return job

    def update_job(self, job_id: int, job_data: JobUpdate) -> Job:
        job = self.get_job(job_id)
        return self.repository.update(job, job_data.model_dump())

    def delete_job(self, job_id: int) -> None:
        job = self.get_job(job_id)
        self.repository.delete(job)

    def update_status(self, job_id: int, status_update: JobStatusUpdate) -> Job:
        job = self.get_job(job_id)
        return self.repository.update_status(job, status_update.status.value)

    @staticmethod
    def generate_jd(request: GenerateJDRequest) -> dict:
        return generate_job_description(
            title=request.title,
            department=request.department,
            location=request.location,
            employment_type=request.employment_type,
            experience_required=request.experience_required,
            salary_min=request.salary_min,
            salary_max=request.salary_max,
            openings=request.openings,
            description=request.description,
        )
