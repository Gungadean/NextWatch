#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
employee_position_models.py

This module defines Pydantic models (Schemas) for representing the
Many-to-Many relationship between Employees and Positions.
"""
from pydantic import BaseModel


class EmployeePositionQueryResponse(BaseModel):
    """
    Response model for a simplified Position object.

    This is typically nested inside an Employee response to list their
    qualifications without including the full metadata (description, created_by, etc.)
    found in the main `PositionQueryResponse`.
    """
    id: int
    name: str