#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
member_models.py

Module containing BaseModels for member endpoints.
"""
from typing import List

from pydantic import BaseModel


class MemberAddRequest(BaseModel):
    """
    A model representing data for a member add request.
    """
    first_name: str
    last_name: str
    middle_name: str
    email: str
    quals: List[int]


class MemberDeleteRequest(BaseModel):
    """
    A model representing member to be deleted.
    """
    id: int


class MemberQueryResponse(BaseModel):
    """
    A model representing a member query.
    """
    id: int
    first_name: str
    last_name: str
    middle_name: str
    email: str
    quals: List[int]