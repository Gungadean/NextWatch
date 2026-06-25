#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

from datetime import datetime, timedelta, timezone
import uuid
from typing import Optional

from sqlmodel import SQLModel, Field, Relationship


class EmployeeInvite(SQLModel, table=True):
    """
    Represents a pending invitation for an employee to register.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employee.id")
    token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)
    is_used: bool = Field(default=False)
    used_at: Optional[datetime] = Field(default=None)
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=7))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = Field(nullable=False)

    employee: "Employee" = Relationship() # noqa: F821


class User(SQLModel, table=True):
    """
    Represents a system user for authentication purposes.

    This model handles login credentials and access roles. Can be linked to
    an Employee profile.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(..., max_length=50)
    password_hashed: str = Field(..., max_length=128)
    is_active: bool = Field(default=True)
    role: str = Field(default="user") # e.g., 'admin', 'manager', 'user'
    created_at: datetime = Field(default_factory=datetime.now)
    last_login: datetime = Field(default_factory=datetime.now)

    # One-to-One relationship with Employee
    employee: Optional["Employee"] = Relationship(back_populates="user") # noqa: F821