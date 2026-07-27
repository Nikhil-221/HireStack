from fastapi import FastAPI
from .database import Base,engine
from .routers import auth,users
from . import models

app = FastAPI()

app.include_router(router=auth.router)
app.include_router(router=users.router)

Base.metadata.create_all(bind = engine)