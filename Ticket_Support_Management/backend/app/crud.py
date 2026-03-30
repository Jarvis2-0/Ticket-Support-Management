from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timezone
from typing import Optional, List, Dict, Tuple, Any
from . import models, schemas
from .auth import get_password_hash, verify_password
import uuid


# Helper to safely get username from user ID (returns a string)
def get_username(db: Session, user_id: Optional[int]) -> str:
    if user_id is None:
        return "None"
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return user.username if user else f"User {user_id} (deleted)"

def generate_ticket_number() -> str:
    """Generate a unique ticket number like TKT-3F8A2B9C."""
    return f"TKT-{uuid.uuid4().hex[:8].upper()}"

# User operations
def create_user(db: Session, user_data: schemas.UserCreate) -> models.User:
    existing = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed = get_password_hash(user_data.password)
    db_user = models.User(
        username=user_data.username,
        hashed_password=hashed,
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=True               # new users are active by default
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str) -> models.User:
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:           # NEW: check active status
        raise HTTPException(status_code=401, detail="User account is disabled")
    return user

def get_user_by_id(db: Session, user_id: int) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_all_users(db: Session) -> List[models.User]:
    return db.query(models.User).all()

def is_assignable_user(db: Session, user_id: int) -> bool:
    """Check if a user can be assigned tickets (agent or admin) and is active."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return user and user.role in [models.UserRole.AGENT, models.UserRole.ADMIN] and user.is_active

def update_user_role(db: Session, user_id: int, new_role: models.UserRole, current_user: models.User) -> models.User:
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can change user roles")
    user = get_user_by_id(db, user_id)
    if user.role == models.UserRole.ADMIN and user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change role of another admin")
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user

def toggle_user_active(db: Session, user_id: int, is_active: bool, current_user: models.User) -> models.User:
    # Only admins can perform this action
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can toggle user active status")
    
    # Prevent deactivating your own account
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    
    user = get_user_by_id(db, user_id)
    
    # Additional safety: if deactivating an admin, ensure at least one active admin remains
    if user.role == models.UserRole.ADMIN and not is_active:
        active_admin_count = db.query(models.User).filter(
            models.User.role == models.UserRole.ADMIN,
            models.User.is_active == True
        ).count()
        if active_admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot deactivate the last active admin")
    
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: int, current_user: models.User) -> None:
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = get_user_by_id(db, user_id)
    # Check for tickets
    created_tickets = db.query(models.Ticket).filter(models.Ticket.created_by_id == user_id).count()
    assigned_tickets = db.query(models.Ticket).filter(models.Ticket.assigned_to_id == user_id).count()
    if created_tickets > 0 or assigned_tickets > 0:
        raise HTTPException(status_code=400, detail="Cannot delete user with existing tickets")
    db.delete(user)
    db.commit()


# Ticket operations
def create_ticket(db: Session, ticket: schemas.TicketCreate, user_id: int, current_user: models.User) -> models.Ticket:
    
    if current_user.role == models.UserRole.AGENT:
        raise HTTPException(status_code=403, detail="Agents cannot create tickets") 
    
    assigned_to_id:  Optional[int] = ticket.assigned_to_id

    if assigned_to_id is not None and not is_assignable_user(db, assigned_to_id):
        raise HTTPException(status_code=400, detail="Tickets can only be assigned to agents or admins")

    db_ticket = models.Ticket(
        ticket_number=generate_ticket_number(),
        title=ticket.title,
        description=ticket.description,
        priority=ticket.priority,
        created_by_id=user_id,
        assigned_to_id=assigned_to_id,
        status=models.TicketStatus.OPEN
    )
    db.add(db_ticket)
    db.flush()

    # Record creation history
    history = models.TicketHistory(
        ticket_id=db_ticket.id,
        user_id=user_id,
        action="created",
        old_value=None,
        new_value="Ticket created"
    )
    db.add(history)

    if assigned_to_id:
        assignee_name = get_username(db, assigned_to_id)
        assign_history = models.TicketHistory(
            ticket_id=db_ticket.id,
            user_id=user_id,
            action="assigned",
            old_value=None,
            new_value=assignee_name
        )
        db.add(assign_history)

    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def get_tickets(
    db: Session,
    user: models.User, 
    status: Optional[models.TicketStatus] = None,
    priority: Optional[models.TicketPriority] = None,
    assigned_to: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> List[models.Ticket]:
    from sqlalchemy.orm import joinedload
    query = db.query(models.Ticket).options(
        joinedload(models.Ticket.creator),
        joinedload(models.Ticket.assignee)
    )
    if user.role == models.UserRole.VIEWER:
        # Viewer sees only tickets they created
        query = query.filter(models.Ticket.created_by_id == user.id)
    elif user.role == models.UserRole.AGENT:
        # Agent sees only tickets assigned to them
        query = query.filter(models.Ticket.assigned_to_id == user.id)
    if status is not None:
        query = query.filter(models.Ticket.status == status)
    if priority is not None:
        query = query.filter(models.Ticket.priority == priority)
    if assigned_to is not None:
        query = query.filter(models.Ticket.assigned_to_id == assigned_to)
    return query.offset(skip).limit(limit).all()

def get_ticket_by_id(db: Session, ticket_id: int) -> models.Ticket:
    from sqlalchemy.orm import joinedload
    ticket = db.query(models.Ticket).options(
        joinedload(models.Ticket.creator),
        joinedload(models.Ticket.assignee)
    ).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.view_count += 1
    db.commit()
    return ticket


def get_ticket_history(db: Session, ticket_id: int) -> List[Dict[str, Any]]:
    """Return ticket history with user names."""
    history = db.query(models.TicketHistory).filter(
        models.TicketHistory.ticket_id == ticket_id
    ).order_by(models.TicketHistory.timestamp).all()
    result: List[Dict[str, Any]] = []
    for h in history:
        user = db.query(models.User).get(h.user_id)
        result.append({
            "user_id": h.user_id,
            "user_name": user.username if user else "Unknown",
            "action": h.action,
            "old_value": h.old_value,
            "new_value": h.new_value,
            "comment": h.comment,
            "timestamp": h.timestamp.isoformat()
        })
    return result


def update_ticket(
    db: Session,
    ticket_id: int,
    update_data: schemas.TicketUpdate,
    current_user: models.User
) -> models.Ticket:
    ticket = get_ticket_by_id(db, ticket_id)

    if ticket.status == models.TicketStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Resolved tickets cannot be updated")
    # Permission checks

    if current_user.role == models.UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot update tickets")
    if current_user.role == models.UserRole.AGENT and ticket.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update assigned tickets")

    # Assignment change: allow agents to reassign only if they are current assignee
    if update_data.assigned_to_id is not None and update_data.assigned_to_id != ticket.assigned_to_id:
        if current_user.role != models.UserRole.ADMIN:
            if not (current_user.role == models.UserRole.AGENT and ticket.assigned_to_id == current_user.id):
                raise HTTPException(status_code=403, detail="Only admins or the current assignee can reassign tickets")
        if not is_assignable_user(db, update_data.assigned_to_id):
            raise HTTPException(status_code=400, detail="Tickets can only be assigned to active agents or admins")


    # Collect changes for history
    changes: List[Tuple[str, Optional[str], Optional[str]]] = []
    comment = update_data.comment

    # Status change
    if update_data.status is not None and update_data.status != ticket.status:
        if current_user.role != models.UserRole.ADMIN:
            allowed_transitions: Dict[models.TicketStatus, List[models.TicketStatus]] = {
                models.TicketStatus.OPEN: [models.TicketStatus.IN_PROGRESS, models.TicketStatus.CLOSED],
                models.TicketStatus.IN_PROGRESS: [models.TicketStatus.RESOLVED, models.TicketStatus.CLOSED],
                models.TicketStatus.RESOLVED: [models.TicketStatus.CLOSED],
                models.TicketStatus.CLOSED: []
            }
            if update_data.status not in allowed_transitions[ticket.status]:
                raise HTTPException(status_code=400, detail=f"Invalid transition from {ticket.status} to {update_data.status}")

        if update_data.status == models.TicketStatus.RESOLVED and not ticket.resolved_at:
            ticket.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
        elif update_data.status == models.TicketStatus.OPEN and ticket.resolved_at:
            ticket.resolved_at = None

        changes.append(("status", ticket.status.value, update_data.status.value))
        ticket.status = update_data.status

    # Priority change
    if update_data.priority is not None and update_data.priority != ticket.priority:
        changes.append(("priority", ticket.priority.value, update_data.priority.value))
        ticket.priority = update_data.priority

    # Assignment change
    if update_data.assigned_to_id is not None and update_data.assigned_to_id != ticket.assigned_to_id:
        old_assignee = get_username(db, ticket.assigned_to_id)
        new_assignee = get_username(db, update_data.assigned_to_id)
        changes.append(("assigned_to", old_assignee, new_assignee))
        ticket.assigned_to_id = update_data.assigned_to_id

    db.commit()
    db.refresh(ticket)

    # Record history entries with optional comment
    for action, old_val, new_val in changes:
        history = models.TicketHistory(
            ticket_id=ticket.id,
            user_id=current_user.id,
            action=action,
            old_value=old_val,
            new_value=new_val,
            comment=comment if action == "status" and comment else None
        )
        db.add(history)

    # If only a comment is added (no other changes)
    if not changes and comment:
        history = models.TicketHistory(
            ticket_id=ticket.id,
            user_id=current_user.id,
            action="comment",
            old_value=None,
            new_value=None,
            comment=comment
        )
        db.add(history)

    db.commit()
    return ticket


def delete_ticket(db: Session, ticket_id: int) -> None:
    ticket = get_ticket_by_id(db, ticket_id)
    history = models.TicketHistory(
        ticket_id=ticket.id,
        user_id=ticket.creator.id,
        action="deleted",
        old_value=None,
        new_value="Ticket deleted"
    )
    db.add(history)
    db.delete(ticket)
    db.commit()


def add_comment(db: Session, ticket_id: int, user_id: int, comment: str) -> None:
    """Add a comment to a ticket (only by creator, assignee, or admin)."""
    ticket = get_ticket_by_id(db, ticket_id)
    # Ensure user is allowed: ticket creator, current assignee, or admin
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not (user.role == models.UserRole.ADMIN or
            ticket.created_by_id == user_id or
            ticket.assigned_to_id == user_id):
        raise HTTPException(status_code=403, detail="Not allowed to comment on this ticket")
    history = models.TicketHistory(
        ticket_id=ticket.id,
        user_id=user_id,
        action="comment",
        comment=comment
    )
    db.add(history)
    db.commit()
