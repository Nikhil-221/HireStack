from fastapi import APIRouter
from ..database import SessionLocal
from passlib.context import CryptContext
from typing import Annotated, Optional
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from ..models import *
from datetime import date
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

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict,Depends(get_current_user)]

class UserRequest(BaseModel):
    name : str
    email : str
    username : str
    password : str
    role : str
    is_active : bool
    joining_date : date

@router.post("/create_user",status_code=status.HTTP_201_CREATED)
async def create_user(db:db_dependency,user:UserRequest):
    new_user = Users(
        name = user.name,
        email = user.email,
        username = user.username,
        hashed_password = bcrypt_context.hash(user.password),
        role = user.role
    )
    db.add(new_user)
    db.commit()
    return {"message":"User created"}

@router.get("get_all_users",status_code = status.HTTP_200_OK)
async def get_all_users(db:db_dependency,user:user_dependency):
    return db.query(Users).all()