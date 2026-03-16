#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
schedule_schemas.py

This module defines Pydantic models (Schemas) for Schedule-related API operations.
"""

import uuid
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class DraftWatchstander(BaseModel):
    """
    Lightweight Draft model for the watchstander sent from the React UI.
    """
    id: int
    name: str
    watchstations: Optional[List[int]]
    offset: Optional[int]


class DraftWatchstation(BaseModel):
    """
    Draft model to mirror the ewatchbill DraftWatchstation model but with
    an optional color field and removing the offset field.
    """
    id: int
    name: str
    color: Optional[str] = None


class DraftAssignment(BaseModel):
    """
    Draft model to mirror the ewatchbill Assignment model but allowing for optional fields.
    """
    date: date
    watchstander: DraftWatchstander
    watchstation: DraftWatchstation
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ScheduleRequest(BaseModel):
    """
    Request model for initiating the schedule generation process.

    This contains the configuration "knobs" for the genetic algorithm.
    """
    start_date: date
    end_date: date

    # List of Position IDs to be filled in this schedule run
    position_ids: List[int]

    # Constraints
    min_days_off: int = 1
    max_steps: int = 50000

    # Manual overrides or specific constraint injections
    manual_conflicts: List[Dict[str, Any]] = []
    holidays: List[date] = []
    frozen_assignments: List[DraftAssignment] = []
    skeleton: List[DraftAssignment] = []


class ScheduleDraftSummaryRequest(BaseModel):
    """
    Response model for a list of schedule drafts.

    This is a "lightweight" view that excludes the heavy 'assignments' JSON blob,
    used for displaying the history list in the UI.
    """
    public_id: uuid.UUID
    created_at: datetime
    start_date: datetime
    end_date: datetime
    score: float


class EmployeePublic(BaseModel):
    """
    Lightweight Employee model.

    Used when nesting inside other objects (like Shifts) to avoid circular dependencies
    and reduce payload size.
    """
    id: int
    first_name: str
    last_name: str
    middle_name: str


class PositionPublic(BaseModel):
    """
    Lightweight Position model.

    Used when nesting inside Shifts to provide just the essential UI data (Name + Color).
    """
    id: int
    name: str
    color: str


class EmployeeShiftRequest(BaseModel):
    """
    Response model for a single Shift.

    This is the primary model used by the frontend Calendar view. It eagerly embeds
    the Employee and Position details so the UI can render the shift block (color/name)
    without fetching extra data.
    """
    id: int
    shift_date: date
    start_time: datetime
    end_time: datetime
    employee: Optional[EmployeePublic] = None
    position: Optional[PositionPublic] = None