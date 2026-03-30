from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import schemas, crud, models
from ..dependencies import get_db, get_current_user, require_role
from ..cache import cache_get, cache_set, cache_delete_pattern

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.get("/", response_model=List[schemas.TicketOut])
def list_tickets(
    status: Optional[models.TicketStatus] = Query(None),
    priority: Optional[models.TicketPriority] = Query(None),
    assigned_to: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    cache_key = f"tickets:{current_user.role}:{current_user.id}:{status}:{priority}:{assigned_to}:{skip}:{limit}"
    cached = cache_get(cache_key)
    if cached:
        return [schemas.TicketOut.model_validate(t) for t in cached]
    tickets = crud.get_tickets(db, current_user, status, priority, assigned_to, skip, limit)
    result = [schemas.TicketOut.model_validate(t) for t in tickets]
    cache_set(cache_key, [t.model_dump() for t in result], expire=300)
    return result


@router.post("/", response_model=schemas.TicketOut)
def create_ticket(
    ticket: schemas.TicketCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_ticket = crud.create_ticket(db, ticket, current_user.id, current_user)
    cache_delete_pattern("tickets:*")
    return schemas.TicketOut.model_validate(new_ticket)


@router.get("/{ticket_id}", response_model=schemas.TicketOut)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ticket = crud.get_ticket_by_id(db, ticket_id)
    # Optional: Check permission to view this ticket
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.AGENT] and ticket.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this ticket")
    return schemas.TicketOut.model_validate(ticket)


@router.patch("/{ticket_id}", response_model=schemas.TicketOut)
def update_ticket(
    ticket_id: int,
    update: schemas.TicketUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated = crud.update_ticket(db, ticket_id, update, current_user)
    cache_delete_pattern("tickets:*")
    return schemas.TicketOut.model_validate(updated)

@router.post("/{ticket_id}/comments", status_code=201)   # NEW
def add_comment(
    ticket_id: int,
    comment_data: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    crud.add_comment(db, ticket_id, current_user.id, comment_data.comment)
    cache_delete_pattern(f"tickets:{ticket_id}:history")   # optionally invalidate history cache
    return {"message": "Comment added"}


@router.get("/{ticket_id}/history")
def get_history(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Permission check: can view history if allowed to view ticket
    ticket = crud.get_ticket_by_id(db, ticket_id)  # this increments view count
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.AGENT] and ticket.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view history")
    history = crud.get_ticket_history(db, ticket_id)
    return history

@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    crud.delete_ticket(db, ticket_id)
    cache_delete_pattern("tickets:*")
    return {"message": "Ticket deleted"}