#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
account_schemas.py

This module defines Pydantic models (Schemas) for Account-related API operations.
These schemas are used for request validation and response serialization.
"""

from datetime import datetime

from pydantic import BaseModel


class AccountDataResponse(BaseModel):
    """
    Response model for the current user's profile information.

    This combines authentication data (username/email) with the link to their
    personnel record (employee_id), allowing the frontend to understand both
    who is logged in and which schedule they belong to.
    """
    username: str
    email: str
    employee_id: int | None
    role: str
    last_login: datetime
    created_at: datetime


class PasswordResetRequest(BaseModel):
    """
    Request model for changing a user's password.

    Requires current_password to verify the user's identity before allowing
    the change (Double-Verification).
    """
    current_password: str
    new_password: str