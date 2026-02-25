#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston
import uuid
from datetime import datetime, date
from typing import Optional, List

from sqlalchemy import Column, JSON
from sqlmodel import SQLModel, Field


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