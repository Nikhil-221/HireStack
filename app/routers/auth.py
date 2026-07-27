import os
from fastapi import APIRouter
from ..database import SessionLocal
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from typing import Annotated
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from datetime import datetime
from datetime import timezone,timedelta
from ..models import Users
from jose import jwt, JWTError
from starlette import status
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')
ALGORITHM = 'HS256'

async def create_access_token(username: str,user_id: int,role: str,expires_delta: timedelta):
    encode = {
        "sub": username,
        "id": user_id,
        "role": role
    }
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({"exp": expires})
    return jwt.encode(
        encode,
        os.getenv("SECRET_KEY"),
        algorithm=ALGORITHM
    )

async def authenticate(username:str, password:str, db: Session):
    model = db.query(Users).filter(Users.username.ilike(username)).first()
    if model is None:
        return None
    result = bcrypt_context.verify(
        password,
        model.hashed_password
    )
    if not result:
        return None
    return model

async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]):
    try:
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY"),
            algorithms=[ALGORITHM]
        )
        username = payload.get("sub")
        user_id = payload.get("id")
        user_role = payload.get("role")
        if username is None or user_id is None or user_role is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Could not validate user")
        return {
            "username": username,
            "id": user_id,
            "role": user_role
        }
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Could not validate user") 
     
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict,Depends(get_current_user)]

@router.post("/token",status_code=status.HTTP_200_OK)
async def login(db: db_dependency,form_data: Annotated[OAuth2PasswordRequestForm,Depends()]):
    user = await authenticate(form_data.username,form_data.password,db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate"
        )
    token = await create_access_token(
        user.username,
        user.id,
        user.role,
        timedelta(minutes=60)
    )
    return {
        "access_token": token,
        "token_type": "bearer"
    }