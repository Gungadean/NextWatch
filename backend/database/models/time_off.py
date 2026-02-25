#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

from datetime import datetime, date
from typing import Optional

from sqlmodel import SQLModel, Field, Relationship


class TimeOffRequest(SQLModel, table=True):
    """
    Represents a request for time off (Vacation, Sick, etc.).
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: Optional[int] = Field(foreign_key="employee.id", ondelete="CASCADE")

    created_at: datetime = Field(default_factory=datetime.now)
    start_date: date
    end_date: date

    request_type: Optional[str] = Field(default="Vacation")  # Enum: Vacation, Sick, Personal, etc.
    status: Optional[str] = Field(default="Pending")  # Enum: Pending, Approved, Denied

    employee: Optional["Employee"] = Relationship(back_populates="time_off_requests")