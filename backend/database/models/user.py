#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Relationship


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
    employee: Optional["Employee"] = Relationship(back_populates="user") # noqa: F821