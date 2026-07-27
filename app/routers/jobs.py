from typing import Annotated, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette import status
from ..database import SessionLocal
from ..schemas.job import (
    JobCreate,
    JobUpdate,
    JobStatusUpdate,
    JobOut,
    GenerateJDRequest,
    GenerateJDResponse,
)
from ..services.job_service import JobService
from .auth import require_recruiter

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(require_recruiter)]

@router.post("/generate-jd", status_code=status.HTTP_200_OK, response_model=GenerateJDResponse)
async def generate_jd(user: user_dependency, request: GenerateJDRequest):
    return JobService.generate_jd(request)

@router.post("", status_code=status.HTTP_201_CREATED, response_model=JobOut)
async def create_job(db: db_dependency, user: user_dependency, job: JobCreate):
    return JobService(db).create_job(job)

@router.get("", status_code=status.HTTP_200_OK, response_model=List[JobOut])
async def get_all_jobs(db: db_dependency, user: user_dependency):
    return JobService(db).get_all_jobs()

@router.get("/{job_id}", status_code=status.HTTP_200_OK, response_model=JobOut)
async def get_job(db: db_dependency, user: user_dependency, job_id: int):
    return JobService(db).get_job(job_id)

@router.put("/{job_id}", status_code=status.HTTP_200_OK, response_model=JobOut)
async def update_job(db: db_dependency, user: user_dependency, job_id: int, job: JobUpdate):
    return JobService(db).update_job(job_id, job)

@router.delete("/{job_id}", status_code=status.HTTP_200_OK)
async def delete_job(db: db_dependency, user: user_dependency, job_id: int):
    JobService(db).delete_job(job_id)
    return {"message": "Job deleted"}

@router.patch("/{job_id}/status", status_code=status.HTTP_200_OK, response_model=JobOut)
async def change_job_status(db: db_dependency, user: user_dependency, job_id: int, status_update: JobStatusUpdate):
    return JobService(db).update_status(job_id, status_update)
