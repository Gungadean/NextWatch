#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
auth_tokens_utils.py

This module provides utilities for the JWT (JSON Web Token) lifecycle.
"""

from datetime import datetime, timezone, timedelta

import jwt
from fastapi import Response, Request, HTTPException, status
from jwt import InvalidTokenError

from schemas.auth_schemas import TokenData
from utils.auth.auth_utils import (
    ALGORITHM,
    SECRET_ACCESS,
    TOKEN_ACCESS_EXPIRATION,
    TOKEN_REFRESH_EXPIRATION,
    SECRET_REFRESH
)


def get_current_token(request: Request) -> str:
    """
    Retrieve the current authentication token from the request.

    Args:
        request (Request): The incoming HTTP request.

    Returns:
        Optional[str]: The raw token string if found, else None.
    """
    # Attempt to get the authorization header
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header:
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]

    # If no token was found in the header, check the access token cookie.
    if not token:
        token = request.cookies.get("access_token")
    return token


def get_token_data(token: str, token_type: str) -> TokenData:
    """
    Decode and validate a JWT string.

    This function verifies the signature using the appropriate secret key
    (Access vs Refresh) and checks the expiration claim.

    Args:
        token (str): The raw JWT string.
        token_type (str): 'access' or 'refresh'. Determines which secret key to use.

    Returns:
        TokenData: The decoded claims (username/expiration).

    Raises:
        HTTPException (401): If the token is invalid, expired, or malformed.
    """
    if token_type == "access":
        secret = SECRET_ACCESS
    else:
        secret = SECRET_REFRESH

    try:
        # Decode and verify signature
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        expiration: int = payload.get("exp")

        # Determine if this token is expired.
        if expiration < datetime.now(timezone.utc).timestamp():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"})

        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="The user associated with this token does not exist",
                headers={"WWW-Authenticate": "Bearer"}
            )

        return TokenData(email=email, expiration=expiration)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )


def create_access_token(data: dict) -> str:
    """
    Generate a short-lived Access Token.

    This token is used to authorize API requests.

    Args:
        data (dict): Payload data (must include 'sub' for email).

    Returns:
        str: The encoded JWT string.
    """
    to_encode = data.copy()

    # Set expiration time.
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_ACCESS_EXPIRATION)
    to_encode.update({"exp": expire})

    access_token = jwt.encode(to_encode, SECRET_ACCESS, algorithm=ALGORITHM)
    return access_token


def create_refresh_token(data: dict, response: Response) -> None:
    """
    Generate a long-lived Refresh Token and set it as an HTTP-Only cookie.

    Use httponly=True to prevent browser from reading the cooking.

    Args:
        data (dict): Payload data.
        response (Response): The FastAPI response object to attach the cookie to.
    """
    to_encode = data.copy()

    # Set expiration
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_REFRESH_EXPIRATION)
    to_encode.update({"exp": expire})

    refresh_token = jwt.encode(to_encode, SECRET_REFRESH, algorithm=ALGORITHM)

    response.set_cookie(
        'refresh_token',
        refresh_token,
        httponly=True,
        secure=True,
        samesite='strict',
        max_age=60 * 60 * 24 * 30
    )


def create_tokens(data: dict, response: Response) -> str:
    """
    Orchestrate the creation of both Access and Refresh tokens.

    Used during Login and Registration flows.

    Args:
        data (dict): User data for the token payload.
        response (Response): Response object to set the refresh cookie.

    Returns:
        str: The generated Access Token (to be returned in the response body).
    """
    access_token = create_access_token(data)
    create_refresh_token(data, response)

    return access_token
