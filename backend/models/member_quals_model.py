#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
member_quals_models.py

Module containing BaseModels for member quals.
"""
from pydantic import BaseModel


class MemberQualQueryResponse(BaseModel):
    """
    A model representing data for a member add request.
    """
    id: int
    name: str