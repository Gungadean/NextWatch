#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
auth_schemas.py

This module defines Pydantic models (Schemas) for Authentication-related API operations.
"""

from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
    """
    Response model for successful authentication.

    This is sent to the client immediately after login or registration.
    Note: The refresh_token is NOT included here as it is securely set
    as an HTTP-only cookie, not returned in the JSON body.
    """
    username: str
    access_token: str


class TokenData(BaseModel):
    """
    Internal model representing the decoded claims of a JWT.

    Used during token verification to ensure the token contains a valid
    sub (subject/username) and expiration timestamp.
    """
    username: Optional[str]
    expiration: Optional[int]


class RegisterRequest(BaseModel):
    """
    Request model for new user registration.

    Validates that the client provides all necessary fields to create
    a functioning user account before hitting the database logic.
    """
    username: str
    email: str
    role: Optional[str]
    password: str