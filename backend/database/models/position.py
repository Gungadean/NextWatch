#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston
from datetime import datetime
from typing import Optional, List

from sqlmodel import SQLModel, Field, Relationship

from database.models import EmployeePosition


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
    employees: Optional[List["Employee"]] = Relationship( # noqa: F821
        back_populates="positions",
        link_model=EmployeePosition)

    shifts: List["Shift"] = Relationship(back_populates="position") # noqa: F821