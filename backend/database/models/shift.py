#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston
from datetime import date, datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Relationship


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