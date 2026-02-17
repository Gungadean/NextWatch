#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
auth_users_utils.py

Utilities for creating/authenticating users safely.
"""

import re
from datetime import timezone, datetime
from typing import Optional, Annotated

from fastapi import Depends, status, HTTPException
from sqlmodel import Session, select

from backend.database.database import User, get_session
from backend.utils.auth.auth_utils import verify_password
from backend.utils.auth.auth_tokens_utils import get_current_token, get_token_data


def get_user(identifier: str, session: Session) -> Optional[User]:
    """
    Retrieve a user from the database using either their username OR email.

    This function automatically detects if the identifier is an email address
    and adjusts the database query accordingly.

    Args:
        identifier (str): The username or email string.
        session (Session): The active database session.

    Returns:
        Optional[User]: The User object if found, otherwise None.
    """
    # Regex for matching an email.
    email_regex = r"^\S+@\S+\.\S+$"

    statement = select(User).where(
        User.email == identifier if re.match(email_regex, identifier)
        else User.username == identifier
    )

    user = session.exec(statement).one_or_none()
    return user


def get_authenticated_user(identifier: str, password: str, session: Session) -> Optional[User]:
    """
    Authenticate a user by verifying their password.

    Args:
        identifier (str): Username or email.
        password (str): The raw (unhashed) password to verify.
        session (Session): The active database session.

    Returns:
        Optional[User]: The authenticated User object if credentials are valid, else None.
    """
    user = get_user(identifier, session)

    if not user:
        return None

    if not verify_password(password, user.password_hashed.encode("utf-8")):
        return None

    user.last_login = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)

    return user


def get_current_user(
        token: Optional[str] = Depends(get_current_token),
        session: Session = Depends(get_session)
) -> Optional[User]:
    """
    FastAPI Dependency: Retrieve the current user from the request's JWT token.

    Args:
        token (str): Injected dependency from `get_current_token`.
        session (Session): Injected database session.

    Returns:
        Optional[User]: The user associated with the token.

    Raises:
        HTTPException (401): If the token is invalid or the user no longer exists.
    """
    # If no token data was found, return None.
    if not token:
        return None

    token_data = get_token_data(token, "access")
    user = get_user(token_data.username, session)

    if user is None:
        raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"})

    return user


def get_current_active_user(
        current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    FastAPI Dependency: Retrieve the current user AND ensure they are 'active'.

    This is the standard dependency to use for protected routes.

    Args:
        current_user (User): The user resolved by `get_current_user`.

    Returns:
        User: The active user object.

    Raises:
        HTTPException (403): If the user account has been disabled (is_active=False).
    """
    if current_user.is_active:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Inactive user")
