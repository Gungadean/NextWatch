#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
account.py

Router for account backend.
"""


from fastapi import APIRouter, Depends, status, HTTPException

from backend.database.database import User
from backend.models.account_models import AccountDataResponse, PasswordResetRequest
from backend.models.generic_models import MessageResponse
from backend.utils.auth.auth_utils import update_password
from backend.utils.auth.auth_users_utils import get_authenticated_user, get_current_active_user

router = APIRouter()


@router.get('/account/info')
async def route_info_user(user: User = Depends(get_current_active_user)) -> AccountDataResponse:
    """
    Endpoint to get the current user information.
    :param user: User instance to get data about.
    :return: AccountDataResponse instance
    """
    return AccountDataResponse(username=user.username, email=user.email,
                               last_login=user.last_login, creation_date=user.created_at)


@router.post('/account/change-password')
async def route_reset_password(data: PasswordResetRequest,
                         user: User = Depends(get_current_active_user)) -> MessageResponse:
    """
    Endpoint to handle password reset requests.
    :param data: Model with current and new password.
    :param user: User instance of the password to be changed.
    :return: If the password was successfully changed.
    :raise: HTTPException: If password is incorrect or an unknown error occurred.
    """
    # Attempt to authenticate the user with current password before
    user = get_authenticated_user(user.username, data.current_password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your current password is incorrect",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = update_password(user.email, data.new_password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An unknown error occurred during password reset",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return MessageResponse(message="Password reset successful")
