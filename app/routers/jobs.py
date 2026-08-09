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
from ..models import Application, CandidateProfile, Users
from ..schemas.application import ApplicationStatusUpdate, JobApplicantOut
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

@router.get("/{job_id}/applications", status_code=status.HTTP_200_OK, response_model=List[JobApplicantOut])
async def get_job_applications(db: db_dependency, user: user_dependency, job_id: int):
    JobService(db).get_job(job_id)
    rows = (
        db.query(Application, Users, CandidateProfile)
        .join(Users, Users.id == Application.candidate_id)
        .outerjoin(CandidateProfile, CandidateProfile.user_id == Users.id)
        .filter(Application.job_id == job_id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return [
        {
            "id": application.id,
            "candidate_id": candidate.id,
            "name": candidate.name,
            "email": candidate.email,
            "phone": profile.phone if profile else None,
            "location": profile.location if profile else None,
            "experience": profile.experience if profile else None,
            "resume_filename": application.resume_filename,
            "status": application.status,
            "applied_at": application.applied_at,
            "updated_at": application.updated_at,
        }
        for application, candidate, profile in rows
    ]

@router.patch("/{job_id}/applications/{application_id}/status", status_code=status.HTTP_200_OK, response_model=JobApplicantOut)
async def update_application_status(
    db: db_dependency,
    user: user_dependency,
    job_id: int,
    application_id: int,
    status_update: ApplicationStatusUpdate,
):
    application = (
        db.query(Application)
        .filter(Application.id == application_id, Application.job_id == job_id)
        .first()
    )
    if application is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    application.status = status_update.status.value
    db.commit()
    db.refresh(application)
    candidate = db.query(Users).filter(Users.id == application.candidate_id).first()
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == candidate.id).first()
    return {
        "id": application.id,
        "candidate_id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "phone": profile.phone if profile else None,
        "location": profile.location if profile else None,
        "experience": profile.experience if profile else None,
        "resume_filename": application.resume_filename,
        "status": application.status,
        "applied_at": application.applied_at,
        "updated_at": application.updated_at,
    }
