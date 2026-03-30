from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, crud, models
from ..dependencies import get_db, get_current_user, require_role
from ..cache import cache_get, cache_set, cache_delete_pattern
from ..schemas import UserActivityOut, UserRoleUpdate, UserUpdateActive

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    cached = cache_get("users_list")
    if cached:
        return [schemas.UserOut.model_validate(u) for u in cached]
    users = crud.get_all_users(db)
    result = [schemas.UserOut.model_validate(u) for u in users]
    cache_set("users_list", [u.model_dump() for u in result], expire=300)
    return result

@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.id != user_id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    user = crud.get_user_by_id(db, user_id)
    return schemas.UserOut.model_validate(user)



@router.post("/register", response_model=schemas.UserOut)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    user_data.role = models.UserRole.VIEWER
    user = crud.create_user(db, user_data)
    return schemas.UserOut.model_validate(user)


@router.post("/", response_model=schemas.UserOut)
def create_user(user_data: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):
    user = crud.create_user(db, user_data)
    cache_delete_pattern("users_*")
    return schemas.UserOut.model_validate(user)




@router.get("/{user_id}/activity", response_model=UserActivityOut)
def get_user_activity(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_role(["admin"]))):

    user = crud.get_user_by_id(db, user_id)
    created_tickets = db.query(models.Ticket).filter(models.Ticket.created_by_id == user_id).all()
    assigned_tickets = db.query(models.Ticket).filter(models.Ticket.assigned_to_id == user_id).all()
    logins = db.query(models.UserLoginHistory).filter(
        models.UserLoginHistory.user_id == user_id
    ).order_by(models.UserLoginHistory.login_time.desc()).all()

    return UserActivityOut(
        user=schemas.UserOut.model_validate(user),
        created_tickets=[schemas.TicketOut.model_validate(t) for t in created_tickets],
        assigned_tickets=[schemas.TicketOut.model_validate(t) for t in assigned_tickets],
        login_history=[{"time": l.login_time.isoformat(), "ip": l.ip_address} for l in logins]
    )


@router.patch("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    update: UserRoleUpdate,          # now expects a JSON body
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    updated_user = crud.update_user_role(db, user_id, update.role, current_user)
    cache_delete_pattern("users_*")
    return schemas.UserOut.model_validate(updated_user)



@router.patch("/{user_id}/active", response_model=schemas.UserOut)
def toggle_user_active(
    user_id: int,
    update: UserUpdateActive,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    updated_user = crud.toggle_user_active(db, user_id, update.is_active, current_user)
    cache_delete_pattern("users_*")
    return schemas.UserOut.model_validate(updated_user)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    crud.delete_user(db, user_id, current_user)
    cache_delete_pattern("users_*")
    return {"message": "User deleted"}