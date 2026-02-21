#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
request.py

This module defines Pydantic models (Schemas) for Time Off Request operations.
"""
from datetime import date
from typing import Optional

from pydantic import BaseModel

from schemas.schedule_schemas import EmployeePublic


class TimeOffAddRequest(BaseModel):
    """
    Request model for creating a new time-off request.

    Attributes:
        employee_id (int): The ID of the employee requesting time off.
        start_date (date): The first day of the request.
        end_date (date): The last day of the request.
        request_type (str): The category (e.g., 'Vacation', 'Sick', 'Personal').
    """
    employee_id: int
    start_date: date
    end_date: date
    request_type: str


class TimeOffResponsePublic(BaseModel):
    """
    Response model for displaying a time-off request.

    Includes the full 'EmployeePublic' object to allow the frontend to display
    the employee's name alongside the request details without fetching extra data.
    """
    id: int
    employee: EmployeePublic
    start_date: date
    end_date: date
    status: str
    request_type: Optional[str] = None