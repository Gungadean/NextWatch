#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
database.py

Defines the SQLModel database schema and initialization logic.
"""

import uuid
from datetime import datetime, date
from typing import List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import SQLModel, create_engine, Field, Relationship, Session

# TODO: Move to async SQLAlchemy
def get_session():
    """
    Dependency generator for database sessions.
    Yields a session context for use in API endpoints.
    """
    with Session(engine) as session:
        yield session


class User(SQLModel, table=True):
    """
    Represents a system user for authentication purposes.

    This model handles login credentials and access roles. Can be linked to
    an Employee profile.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(..., max_length=50, unique=True)
    email: str = Field(..., max_length=50)
    password_hashed: str = Field(..., max_length=128)
    is_active: bool = Field(default=True)
    role: str = Field(default="user") # e.g., 'admin', 'manager', 'user'
    created_at: datetime = Field(default_factory=datetime.now)
    last_login: datetime = Field(default_factory=datetime.now)

    # One-to-One relationship with Employee
    employee: Optional["Employee"] = Relationship(back_populates="user")


class ScheduleDraft(SQLModel, table=True):
    """
    Represents a generated schedule draft.

    This stores the output of the scheduling algorithm before it is finalized/published.
    The actual assignment data is stored as a JSON blob to allow flexibility
    in the algorithm's output.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    public_id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4)
    created_at: datetime = Field(default_factory=datetime.now)

    start_date: date
    end_date: date
    score: float # Optimization score (lower/higher depending on fitness function)

    # Stores the raw schedule matrix/assignments.
    # Uses SQLAlchemy JSON column type to store Python dicts/lists directly.
    assignments: List[dict] = Field(sa_column=Column(JSON))


class Shift(SQLModel, table=True):
    """
    Represents a finalized, published shift.

    This stores actual shifts that an employee is working.
    """
    id: Optional[int] = Field(default=None, primary_key=True)

    # Cascading delete: If Employee or Position is deleted, their shifts are removed.
    employee_id: int = Field(foreign_key="employee.id", ondelete="CASCADE")
    position_id: int = Field(foreign_key="position.id", ondelete="CASCADE")

    shift_date: date = Field(index=True)
    start_time: Optional[datetime]
    end_time: Optional[datetime]

    employee: "Employee" = Relationship(back_populates="shifts")
    position: "Position" = Relationship(back_populates="shifts")



class TimeOffRequest(SQLModel, table=True):
    """
    Represents a request for time off (Vacation, Sick, etc.).
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: Optional[int] = Field(foreign_key="employee.id", ondelete="CASCADE")

    creation_at: datetime = Field(default_factory=datetime.now)
    start_date: date
    end_date: date
    
    request_type: Optional[str] = Field(default="Vacation") # Enum: Vacation, Sick, Personal, etc.
    status: Optional[str] = Field(default="Pending") # Enum: Pending, Approved, Denied

    employee: Optional["Employee"] = Relationship(back_populates="time_off_requests")


class EmployeePosition(SQLModel, table=True):
    """
    Association (Link) Table for the Many-to-Many relationship
    between Employees and Positions.
    """
    employee_id: Optional[int] = Field(
        primary_key=True,
        default=None,
        foreign_key="employee.id",
        ondelete="CASCADE")
    position_id: Optional[int] = Field(
        primary_key=True,
        default=None,
        foreign_key="position.id",
        ondelete="CASCADE")


class Position(SQLModel, table=True):
    """
    Represents a job role or station (e.g., "Cashier", "Manager", "Cook").
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(..., max_length=50)
    description: str = Field(..., max_length=1000)
    created_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    color: str = Field(default="#000080", max_length=7)

    # Many-to-Many relationship to Employee through EmployeePosition table
    employees: Optional[List["Employee"]] = Relationship(
        back_populates="positions",
        link_model=EmployeePosition)

    shifts: List["Shift"] = Relationship(back_populates="position")


class Employee(SQLModel, table=True):
    """
    Represents an employee profile.

    Contains personal info and links to the authentication User model.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    middle_name: str = Field(..., max_length=50)
    email: str = Field(..., max_length=50)
    created_at: datetime = Field(default_factory=datetime.now)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")

    # Link to auth user (optional, as an employee might exist without a login)
    user: Optional[User] = Relationship(back_populates="employee")

    # Many-to-Many relationship to Position
    positions: Optional[List[Position]] = Relationship(
        back_populates="employees",
        link_model=EmployeePosition)

    shifts: List["Shift"] = Relationship(back_populates="employee")
    time_off_requests: List["TimeOffRequest"] = Relationship(back_populates="employee")


# Create engine from database location and create all SQLModel tables. Only SQLite for now.
# check_same_thread=False is needed for SQLite when used with FastAPI/multi-threading.
engine = create_engine("sqlite:///database.db", connect_args={"check_same_thread": False})
SQLModel.metadata.create_all(engine)