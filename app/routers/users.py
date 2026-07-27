from fastapi import APIRouter
from ..database import SessionLocal
from typing import Annotated
from sqlalchemy.orm import Session
from fastapi import Depends
from ..models import *
from starlette import status
from .auth import get_current_user

router = APIRouter(
    prefix='/users',
    tags=['/users']
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict,Depends(get_current_user)]

@router.get("/get_all_users",status_code = status.HTTP_200_OK)
async def get_all_users(db:db_dependency,user:user_dependency):
    return db.query(Users).all()
