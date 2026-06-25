#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
auth_users_utils.py

Utilities for creating/authenticating users safely.
"""

from datetime import timezone, datetime
from typing import Optional, Annotated

from fastapi import Depends, status, HTTPException
from sqlmodel import Session, select

from database.database import get_session
from database.models import User
from utils.auth.auth_utils import verify_password
from utils.auth.auth_tokens_utils import get_current_token, get_token_data


def get_user(email: str, session: Session) -> Optional[User]:
    """
    Retrieve a user from the database using their email.

    Args:
        email (str): Email string.
        session (Session): The active database session.

    Returns:
        Optional[User]: The User object if found, otherwise None.
    """
    statement = select(User).where(User.email == email)

    user = session.exec(statement).one_or_none()
    return user


def get_authenticated_user(email: str, password: str, session: Session) -> Optional[User]:
    """
    Authenticate a user by verifying their password.

    Args:
        email (str): Email.
        password (str): The raw (unhashed) password to verify.
        session (Session): The active database session.

    Returns:
        Optional[User]: The authenticated User object if credentials are valid, else None.
    """
    user = get_user(email, session)

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
) -> User:
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
    # If no token data was found, raise HTTPException.
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
        return None

    token_data = get_token_data(token, "access")
    user = get_user(token_data.email, session)

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


def require_admin(
        current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """
    FastAPI Dependency: Retrieve the current user AND ensure they are an 'admin'.

    Args:
        current_user (User): The user resolved by `get_current_active_user`.

    Returns:
        User: The admin user object.

    Raises:
        HTTPException (403): If the user account is not an admin.
    """
    if current_user.role == "admin":
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin privileges required"
    )
