from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from ..database import SessionLocal
from ..models import Ticket, User
from ..schemas import AnalyticsOut

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=AnalyticsOut)
def get_analytics(db: Session = Depends(get_db)):
    total = db.query(Ticket).count()

    # By status
    status_counts = db.query(Ticket.status, func.count()).group_by(Ticket.status).all()
    tickets_by_status = {s.value: count for s, count in status_counts}

    # By priority
    priority_counts = db.query(Ticket.priority, func.count()).group_by(Ticket.priority).all()
    tickets_by_priority = {p.value: count for p, count in priority_counts}

    # Created per day (last 7 days)
    from_date = datetime.now().replace(tzinfo=None) - timedelta(days=7)
    daily_counts = db.query(
        func.date(Ticket.created_at).label('date'),
        func.count()
    ).filter(Ticket.created_at >= from_date).group_by(func.date(Ticket.created_at)).all()
    tickets_created_per_day = {str(date): count for date, count in daily_counts}

    # Average resolution time (in seconds)
    resolved_tickets = db.query(Ticket).filter(
        Ticket.resolved_at.isnot(None),
        Ticket.created_at.isnot(None)
    ).all()
    avg_resolution_time_seconds: Optional[float] = None
    if resolved_tickets:
        total_seconds: float = 0.0
        for t in resolved_tickets:
            # Use assertions to help type checker understand these are not None
            assert t.resolved_at is not None
            assert t.created_at is not None
            total_seconds += (t.resolved_at - t.created_at).total_seconds()
        avg_resolution_time_seconds = total_seconds / len(resolved_tickets)

    # Tickets per agent
    agent_counts = db.query(
        User.username,
        func.count(Ticket.id)
    ).join(Ticket, Ticket.assigned_to_id == User.id).group_by(User.id).all()
    tickets_per_agent = {username: count for username, count in agent_counts}

    return AnalyticsOut(
        total_tickets=total,
        tickets_by_status=tickets_by_status,
        tickets_by_priority=tickets_by_priority,
        tickets_created_per_day=tickets_created_per_day,
        avg_resolution_time_seconds=avg_resolution_time_seconds,
        tickets_per_agent=tickets_per_agent
    )