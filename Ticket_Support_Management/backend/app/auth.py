from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import secrets
from . import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SESSION_EXPIRE_MINUTES = 30

def _truncate_password(password: str) -> str:
    """Truncate password to 72 bytes to comply with bcrypt limitation."""
    encoded = password.encode('utf-8')[:72]
    return encoded.decode('utf-8', errors='ignore')

def verify_password(plain: str, hashed: str) -> bool:
    truncated = _truncate_password(plain)
    return pwd_context.verify(truncated, hashed)

def get_password_hash(password: str) -> str:
    truncated = _truncate_password(password)
    return pwd_context.hash(truncated)

def create_session_token(db: Session, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=SESSION_EXPIRE_MINUTES)
    db_session = models.Session(
        session_token=token,
        user_id=user_id,
        expires_at=expires_at
    )
    db.add(db_session)
    db.commit()
    return token

def get_user_from_session(db: Session, token: str) -> Optional[models.User]:
    db_session = db.query(models.Session).filter(
        models.Session.session_token == token,
        models.Session.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
    ).first()
    if db_session:
        return db_session.user
    return None

def delete_session(db: Session, token: str) -> None:
    db.query(models.Session).filter(models.Session.session_token == token).delete()
    db.commit()