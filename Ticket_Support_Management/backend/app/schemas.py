from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Dict, List, Optional, Any
from .models import UserRole, TicketStatus, TicketPriority

# User schemas
class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime
    is_active: bool                  # NEW
    model_config = ConfigDict(from_attributes=True)

class UserUpdateActive(BaseModel):   # NEW
    is_active: bool

class UserLogin(BaseModel):
    username: str
    password: str

# Session
class SessionOut(BaseModel):
    session_token: str
    expires_at: datetime

class LoginResponse(BaseModel):
    user: UserOut
    session: SessionOut

# Ticket schemas
class TicketBase(BaseModel):
    title: str
    description: str
    priority: TicketPriority = TicketPriority.MEDIUM

class TicketCreate(TicketBase):
    assigned_to_id: Optional[int] = None

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to_id: Optional[int] = None
    comment: Optional[str] = None

class TicketOut(TicketBase):
    id: int
    ticket_number: str
    status: TicketStatus
    created_by_id: int
    created_by_name: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime]
    view_count: int                  # NEW
    model_config = ConfigDict(from_attributes=True)

class CommentCreate(BaseModel):      # NEW
    comment: str

# Analytics
class AnalyticsOut(BaseModel):
    total_tickets: int
    tickets_by_status: dict[str, int]
    tickets_by_priority: dict[str, int]
    tickets_created_per_day: dict[str, int]
    avg_resolution_time_seconds: Optional[float]
    tickets_per_agent: dict[str, int]


class RecentActivity(BaseModel):
    ticket_id: int
    ticket_number : Dict[str, int]
    user: str
    action: str
    old_value: Optional[str]
    new_value: Optional[str]
    timestamp: str

class AdminInsights(BaseModel):
    total_users: int
    total_tickets: int
    tickets_created_per_user: Dict[str, int]
    tickets_assigned_per_user: Dict[str, int]
    login_counts_last_week: Dict[str, int]
    recent_activity: List[Dict[str,Any]]


class UserActivityOut(BaseModel):
    user: UserOut
    created_tickets: List[TicketOut]
    assigned_tickets: List[TicketOut]
    login_history: List[Dict[str, Any]]  # or create a LoginHistory schema


class UserRoleUpdate(BaseModel):
    role: UserRole