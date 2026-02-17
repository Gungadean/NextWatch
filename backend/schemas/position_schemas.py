#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
position_schemas.py

This module defines Pydantic models (Schemas) for Position-related API operations.
"""

from datetime import datetime

from pydantic import BaseModel


class PositionAddRequest(BaseModel):
    """
    Request model for creating a new position.

    Attributes:
        color (str): Hex code (e.g., #FF0000) for UI visualization of shifts.
    """
    name: str
    description: str
    color: str

class PositionQueryResponse(PositionAddRequest):
    """
    Response model for position details.

    Inherits from PositionAddRequest to include name/description/color,
    while adding metadata like ID and creator info.
    """
    id: int
    created_by: str
    created_at: datetime


class PositionDeleteRequest(BaseModel):
    """
    Request model for deleting a position.

    We use an object wrapper instead of a raw integer to allow for bulk deletions.
    """
    id: int