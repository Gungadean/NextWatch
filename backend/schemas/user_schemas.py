#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
user_schemas.py

This module defines Pydantic models (Schemas) for User-related API operations.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserRead(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: datetime
    employee_id: Optional[int] = None


class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "user"
    is_active: bool = True
    employee_id: Optional[int] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    employee_id: Optional[int] = None

    class Config:
        # Use Pydantic's 'omit_unset' equivalent so we only update provided fields
        pass


class InviteCreateResponse(BaseModel):
    token: str
    expires_at: datetime
    message: str

class InviteValidateResponse(BaseModel):
    employee_id: int
    first_name: str
    last_name: str
    email: str

class InviteRegisterRequest(BaseModel):
    token: str
    password: str
