#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
qualification_models.py

Module containing BaseModels for qualification endpoints.
"""

from datetime import datetime

from pydantic import BaseModel


class QualificationAddRequest(BaseModel):
    """
    A model representing data for a new qualification.
    """
    name: str
    description: str

class QualificationQueryResponse(QualificationAddRequest):
    """
    A model representing data for responding to Qualification data request.
    """
    id: int
    created_by: str
    created_at: datetime


class QualificationDeleteRequest(BaseModel):
    """
    A model representing a qualification deletion request.
    """
    id: int