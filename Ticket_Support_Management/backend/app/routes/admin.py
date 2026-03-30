from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta
from ..database import SessionLocal
from ..models import User, Ticket, UserLoginHistory, TicketHistory
from ..dependencies import require_role
from ..schemas import AdminInsights
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
router = APIRouter(prefix="/admin", tags=["admin"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/insights", response_model=AdminInsights)
def insights(db: Session = Depends(get_db), _=Depends(require_role(["admin"]))):
    total_users = db.query(User).count()
    total_tickets = db.query(Ticket).count()


    # Tickets created per user
    created_per_user = db.query(
        User.username, func.count(Ticket.id)
    ).join(Ticket, Ticket.created_by_id == User.id).group_by(User.id).all()
    tickets_created_per_user = {username: count for username, count in created_per_user}

    # Tickets assigned per user
    assigned_per_user = db.query(
        User.username, func.count(Ticket.id)
    ).join(Ticket, Ticket.assigned_to_id == User.id).group_by(User.id).all()
    tickets_assigned_per_user = {username: count for username, count in assigned_per_user}

    # Login counts last 7 days
    week_ago = datetime.now().replace(tzinfo=None) - timedelta(days=7)
    login_counts = db.query(
        User.username, func.count(UserLoginHistory.id)
    ).join(UserLoginHistory, UserLoginHistory.user_id == User.id).filter(
        UserLoginHistory.login_time >= week_ago
    ).group_by(User.id).all()
    login_counts_last_week = {username: count for username, count in login_counts}

    # Recent activity (last 10)
    recent_activity = db.query(TicketHistory).options(
        joinedload(TicketHistory.ticket),   # load the ticket object
        joinedload(TicketHistory.user)
    ).order_by(TicketHistory.timestamp.desc()).limit(20).all()

    activity_list:  List[Dict[str, Any]] = []
    for act in recent_activity:
        activity_list.append({
            "ticket_id": act.ticket_id,
            "ticket_number": act.ticket.ticket_number if act.ticket else None,
            "user": act.user.username if act.user else "Unknown",
            "action": act.action,
            "old_value": act.old_value,
            "new_value": act.new_value,
            "timestamp": act.timestamp.isoformat(),
        })
       

    return AdminInsights(
        total_users=total_users,
        total_tickets=total_tickets,
        tickets_created_per_user=tickets_created_per_user,
        tickets_assigned_per_user=tickets_assigned_per_user,
        login_counts_last_week=login_counts_last_week,
        recent_activity = activity_list
    )


@router.get("/user-activity")
def user_activity(db: Session = Depends(get_db), _=Depends(require_role(["admin"]))) -> Dict[str, List[Dict[str, Any]]]:
    users = db.query(User).all()
    result: List[Dict[str, Any]] = []
    for u in users:
        created = db.query(Ticket).filter(Ticket.created_by_id == u.id).count()
        result.append({
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role.value,
            "tickets_created": created,
        })
    return {"users": result}

class RecentActivityItem(BaseModel):
    ticket_id: int
    ticket_number: Optional[str]
    user: str
    action: str
    old_value: Optional[str]
    new_value: Optional[str]
    timestamp: str

class TicketWithCreatorItem(BaseModel):
    id: int
    ticket_number: str
    title: str
    status: str
    priority: str
    creator_id: int
    creator_username: str
    creator_full_name: Optional[str]
    creator_role: str
    created_at: datetime
    assigned_to_id: Optional[int]

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int

@router.get("/recent-activity", response_model=PaginatedResponse)
def get_recent_activity(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"]))
):
    offset = (page - 1) * per_page
    total = db.query(TicketHistory).count()
    history = db.query(TicketHistory).options(
        joinedload(TicketHistory.ticket),
        joinedload(TicketHistory.user)
    ).order_by(TicketHistory.timestamp.desc()).offset(offset).limit(per_page).all()

    items = [
        RecentActivityItem(
            ticket_id=h.ticket_id,
            ticket_number=h.ticket.ticket_number if h.ticket else None,
            user=h.user.username if h.user else "Unknown",
            action=h.action,
            old_value=h.old_value,
            new_value=h.new_value,
            timestamp=h.timestamp.isoformat()
        ).model_dump()
        for h in history
    ]

    return PaginatedResponse(items=items, total=total, page=page, per_page=per_page)

@router.get("/tickets-with-creators", response_model=PaginatedResponse)
def tickets_with_creators(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"]))
):
    offset = (page - 1) * per_page
    total = db.query(Ticket).count()
    tickets = db.query(Ticket).options(
        joinedload(Ticket.creator)
    ).order_by(Ticket.created_at.desc()).offset(offset).limit(per_page).all()

    items = [
        TicketWithCreatorItem(
            id=t.id,
            ticket_number=t.ticket_number,
            title=t.title,
            status=t.status.value,
            priority=t.priority.value,
            creator_id=t.creator.id,
            creator_username=t.creator.username,
            creator_full_name=t.creator.full_name,
            creator_role=t.creator.role.value,
            created_at=t.created_at,
            assigned_to_id=t.assigned_to_id
        ).model_dump()
        for t in tickets
    ]

    return PaginatedResponse(items=items, total=total, page=page, per_page=per_page)
