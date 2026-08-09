from pathlib import Path
from typing import Annotated, List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from starlette import status

from ..database import SessionLocal
from ..models import Application, CandidateProfile, Job, Users
from ..schemas.application import CandidateApplicationOut
from ..schemas.candidate import CandidateProfileOut, CandidateProfileUpdate
from ..schemas.job import JobOut
from .auth import candidate_dependency

router = APIRouter(prefix="/candidate", tags=["candidate"])

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}
RESUME_DIRECTORY = Path("uploads/resumes")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = candidate_dependency


def profile_out(profile: CandidateProfile, user: Users) -> dict:
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "name": user.name,
        "email": user.email,
        "phone": profile.phone,
        "location": profile.location,
        "education": profile.education,
        "experience": profile.experience,
        "skills": profile.skills or [],
        "updated_at": profile.updated_at,
    }


@router.get("/profile", response_model=CandidateProfileOut)
async def get_profile(db: db_dependency, user: user_dependency):
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user["id"]).first()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    candidate = db.query(Users).filter(Users.id == user["id"]).first()
    return profile_out(profile, candidate)


@router.put("/profile", response_model=CandidateProfileOut)
async def save_profile(db: db_dependency, user: user_dependency, payload: CandidateProfileUpdate):
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user["id"]).first()
    if profile is None:
        profile = CandidateProfile(user_id=user["id"], **payload.model_dump())
        db.add(profile)
    else:
        for key, value in payload.model_dump().items():
            setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    candidate = db.query(Users).filter(Users.id == user["id"]).first()
    return profile_out(profile, candidate)


@router.get("/jobs", response_model=List[JobOut])
async def get_open_jobs(db: db_dependency, user: user_dependency):
    return db.query(Job).filter(Job.status == "Open").order_by(Job.created_at.desc()).all()


@router.get("/jobs/{job_id}", response_model=JobOut)
async def get_open_job(db: db_dependency, user: user_dependency, job_id: int):
    job = db.query(Job).filter(Job.id == job_id, Job.status == "Open").first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Open job not found")
    return job


@router.post("/applications", status_code=status.HTTP_201_CREATED, response_model=CandidateApplicationOut)
async def apply_to_job(
    db: db_dependency,
    user: user_dependency,
    job_id: Annotated[int, Form()],
    resume: Annotated[UploadFile, File()],
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user["id"]).first()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Create your profile before applying")
    job = db.query(Job).filter(Job.id == job_id, Job.status == "Open").first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Open job not found")
    if db.query(Application).filter(Application.job_id == job_id, Application.candidate_id == user["id"]).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already applied for this job")

    original_name = resume.filename or "resume"
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a PDF, DOC, or DOCX resume")

    RESUME_DIRECTORY.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}{extension}"
    stored_path = RESUME_DIRECTORY / stored_name
    with stored_path.open("wb") as destination:
        while chunk := await resume.read(1024 * 1024):
            destination.write(chunk)

    application = Application(
        job_id=job.id,
        candidate_id=user["id"],
        resume_filename=original_name,
        resume_path=str(stored_path),
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return candidate_application_out(application, job)


@router.get("/applications", response_model=List[CandidateApplicationOut])
async def get_my_applications(db: db_dependency, user: user_dependency):
    rows = (
        db.query(Application, Job)
        .join(Job, Job.id == Application.job_id)
        .filter(Application.candidate_id == user["id"])
        .order_by(Application.applied_at.desc())
        .all()
    )
    return [candidate_application_out(application, job) for application, job in rows]


def candidate_application_out(application: Application, job: Job) -> dict:
    return {
        "id": application.id,
        "job_id": job.id,
        "job_title": job.title,
        "job_location": job.location,
        "job_deadline": job.deadline,
        "resume_filename": application.resume_filename,
        "status": application.status,
        "applied_at": application.applied_at,
        "updated_at": application.updated_at,
    }
