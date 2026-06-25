#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
account.py

This module defines the API router for account management.
"""


from fastapi import APIRouter, Depends, status, HTTPException
from sqlmodel import Session

from database.database import get_session
from database.models import User
from schemas.account_schemas import AccountDataResponse, PasswordResetRequest
from schemas.generic_schemas import MessageResponse
from utils.auth.auth_utils import get_password_hash
from utils.auth.auth_users_utils import get_authenticated_user, get_current_active_user

router = APIRouter()


@router.get('/account/info')
async def route_info_user(user: User = Depends(get_current_active_user)) -> AccountDataResponse:
    """
    Retrieve the profile information for the currently authenticated user.

    Endpoint uses get_current_active_user dependency to validate JWT token

    Returns:
        AccountDataResponse: A Pydantic model containing username, email, role,
        and linked employee ID (if applicable).
    """
    emp_id = user.employee.id if user.employee else None

    return AccountDataResponse(
        email=user.email,
        role=user.role,
        employee_id=emp_id,
        last_login=user.last_login,
        created_at=user.created_at)


@router.post('/account/change-password')
async def route_reset_password(
        data: PasswordResetRequest,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
    ) -> MessageResponse:
    """
    Change the authenticated user's password.

    Args:
        data (PasswordResetRequest): Contains old and new password.
        user (User): The current user (injected via dependency).
        session (Session): Get database session.

    Raises:
        HTTPException (401): If the current password provided is incorrect.
        HTTPException (400): If the update operation fails.
    """
    # Verify current password before proceeding
    user = get_authenticated_user(user.email, data.current_password, session)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your current password is incorrect",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user.password_hashed = get_password_hash(data.new_password)
    session.add(user)
    session.commit()

    return MessageResponse(message="Password reset successful")