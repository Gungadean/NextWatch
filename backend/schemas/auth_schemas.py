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
    email: str
    access_token: str


class TokenData(BaseModel):
    """
    Internal model representing the decoded claims of a JWT.

    Used during token verification to ensure the token contains a valid
    sub (subject/email) and expiration timestamp.
    """
    email: str
    expiration: int


class RegisterRequest(BaseModel):
    """
    Request model for new user registration.

    Validates fields for creating a new account along with verifying a
    valid invite token.
    """
    token: str
    password: str