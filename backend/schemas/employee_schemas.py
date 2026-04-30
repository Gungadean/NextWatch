#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
employee_schemas.py

This module defines Pydantic models (Schemas) for Employee-related API operations.
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from schemas.request_schemas import TimeOffResponsePublic
from schemas.schedule_schemas import PositionPublic


class EmployeeAddRequest(BaseModel):
    """
    Request model for adding a new employee.

    Attributes:
        positions: A list of Position IDs (integers) that this employee is qualified for.
    """
    first_name: str
    last_name: str
    middle_name: str
    email: str
    positions: List[int]
    max_shift_length: Optional[int] = None
    target_weekly_hours: Optional[int] = None


class EmployeeDeleteRequest(BaseModel):
    """
    Request model for deleting an employee.

    We use a model wrapper instead of a raw integer to allow for bulk deletions
    if this schema is used in a list context.
    """
    id: int


class EmployeeQueryResponse(BaseModel):
    """
    Response model for a basic employee query.

    Returns the list of positions as IDs only.
    """
    id: int
    first_name: str
    last_name: str
    middle_name: str
    email: str
    positions: List[int]
    max_shift_length: Optional[int] = None
    target_weekly_hours: Optional[int] = None


class TimeOffRequestPublic(BaseModel):
    """
    Simplified response model for time-off requests nested within an employee object.
    """
    id: int
    start_date: datetime
    end_date: datetime
    type: str
    status: str


class EmployeeReadWithTimeOff(BaseModel):
    """
    Comprehensive response model for an Employee.

    This is the primary model used for roster views, as it eagerly includes
    both their qualifications (Positions) and their schedule constraints (Time Off).
    """
    id: int
    first_name: str
    last_name: str
    middle_name: str
    email: str
    max_shift_length: Optional[int] = None
    target_weekly_hours: Optional[int] = None

    # Relationships
    time_off_requests: List[TimeOffResponsePublic] = []
    positions: List[PositionPublic] = []