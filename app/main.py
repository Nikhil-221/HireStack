from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base,engine
from .routers import auth,users,jobs
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

Base.metadata.create_all(bind = engine)