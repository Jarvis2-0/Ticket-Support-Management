from fastapi import APIRouter, Depends, Response, Request, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from .. import schemas, crud, auth, models
from ..dependencies import get_db, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=schemas.LoginResponse)
def login(login_data: schemas.UserLogin, response: Response, request: Request, db: Session = Depends(get_db)):

    user = crud.authenticate_user(db, login_data.username, login_data.password)
    token = auth.create_session_token(db, user.id)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=auth.SESSION_EXPIRE_MINUTES)
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=auth.SESSION_EXPIRE_MINUTES * 60,
        secure=False,
        samesite="lax"
    )

    # Record login history
    # request.client.host gives the client's IP address (can be None)
    client_host = request.client.host if request.client else None
    login_history = models.UserLoginHistory(
        user_id=user.id,
        ip_address=client_host
    )
    db.add(login_history)
    db.commit()

    return schemas.LoginResponse(
        user=schemas.UserOut.model_validate(user),
        session=schemas.SessionOut(session_token=token, expires_at=expires_at)
    )



@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    token = request.cookies.get("session_token")
    if token:
        auth.delete_session(db, token)
    response.delete_cookie("session_token")
    return {"message": "Logged out"}

@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserOut.model_validate(current_user)

@router.post("/change_admin", response_model=schemas.UserOut)   # NEW
def setup_admin(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Allow creating the first admin user if no admin exists."""
    # Check if any admin already exists
    existing_admin = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).first()
    if existing_admin:
        raise HTTPException(status_code=403, detail="Admin already exists. Use normal login.")
    user_data.role = models.UserRole.ADMIN
    user = crud.create_user(db, user_data)
    return schemas.UserOut.model_validate(user)
