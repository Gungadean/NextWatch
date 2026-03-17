#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
position_schemas.py

This module defines Pydantic models (Schemas) for Position-related API operations.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict

from schemas.template_schemas import ShiftTemplateRead


class PositionRequirementCreate(BaseModel):
    """
    Model for building a new position requirement
    """
    shift_template_id: int
    count: int = 1
    applies_weekdays: bool = True
    applies_weekends: bool = True

class PositionRequirementRead(PositionRequirementCreate):
    """
    Model for fetching Position Requirements link object
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    position_id: int
    shift_template: Optional[ShiftTemplateRead] = None


class PositionAddRequest(BaseModel):
    """
    Request model for creating a new position.
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


class PositionWithRequirementsRead(PositionQueryResponse):
    """
    Model for requesting a position with its requirements
    """
    requirements: List[PositionRequirementRead] = []


class PositionDeleteRequest(BaseModel):
    """
    Request model for deleting a position.

    We use an object wrapper instead of a raw integer to allow for bulk deletions.
    """
    id: int