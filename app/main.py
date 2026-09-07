from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import Base,engine
from .routers import auth,users,jobs,candidates,coding_questions,coding_tests,coding_attempts,admin_coding_results
from . import models

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router=auth.router)
app.include_router(router=users.router)
app.include_router(router=jobs.router)
app.include_router(router=candidates.router)
app.include_router(router=coding_questions.router)
app.include_router(router=coding_tests.router)
app.include_router(router=coding_attempts.router)
app.include_router(router=admin_coding_results.router)

Base.metadata.create_all(bind=engine)

# `create_all` creates new tables but does not add columns to tables that already
# exist. Keep this MVP migration idempotent so current local databases can use the
# required job deadline field immediately.
with engine.begin() as connection:
    connection.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline DATE"))
    connection.execute(text("ALTER TABLE coding_test_invites ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE"))
