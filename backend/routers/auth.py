#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
auth.py

This module defines the API router for authentication and session management using OAuth2 flow.
"""
from datetime import timezone, datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, status, HTTPException, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from database.database import get_session
from database.models import User, EmployeeInvite, Employee
from schemas.auth_schemas import RegisterRequest, Token
from schemas.generic_schemas import MessageResponse
from utils.auth.auth_tokens_utils import (
    create_tokens,
    get_current_token,
    create_access_token,
    get_token_data
)
from utils.auth.auth_users_utils import (
    get_authenticated_user,
    get_user
)
from utils.auth.auth_utils import get_password_hash

router = APIRouter()


@router.post('/auth/login')
async def route_login_user(
        response: Response,
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        session: Session = Depends(get_session)
) -> Token:
    """
    Authenticate a user and issue session tokens.

    Args:
        response (Response): FastAPI response object (used to set cookies).
        form_data (OAuth2PasswordRequestForm): Standard URL-encoded login form.
        session (Session): Get database session.

    Returns:
        Token: The short-lived access token for API authorization.

    Raises:
        HTTPException (401): If credentials are invalid.
    """
    # Attempt to get an authenticated user based off of the supplied data.
    user = get_authenticated_user(form_data.username, form_data.password, session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    # User successfully authenticated, add refresh token as cookie and return access token.
    access_token = create_tokens(data={"sub": user.email}, response=response)

    return Token(email=user.email, access_token=access_token)


@router.post('/auth/register')
async def route_register_user(
        response: Response,
        register_data: RegisterRequest,
        session: Session = Depends(get_session)
    ) -> Token:
    """
    Register a new user using a valid EmployeeInvite token.

    Args:
        response (Response): FastAPI response object (for setting cookies).
        register_data (RegisterRequest): The registration payload (username, email, password).
        session (Session): Get database session.

    Returns:
        Token: The access token for the newly created session.

    Raises:
        HTTPException (409): If the username or email is already taken.
    """
    invite = session.exec(select(EmployeeInvite).where(EmployeeInvite.token == register_data.token)).first()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite token."
        )

    if invite.expires_at.timestamp() < datetime.now(timezone.utc).timestamp():
        session.delete(invite)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite token has expired."
        )

    employee = session.get(Employee, invite.employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The associated employee does not exist."
        )

    if get_user(employee.email, session):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user already exists for this employee."
        )

    new_user = User(
        email=employee.email,
        password_hashed=get_password_hash(register_data.password),
        is_active=True
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    employee.user_id = new_user.id
    session.add(employee)
    session.commit()
    session.refresh(employee)

    access_token = create_tokens(data={"sub": new_user.email}, response=response)
    return Token(email=new_user.email, access_token=access_token)


@router.post('/auth/logout')
async def route_logout_user(response: Response) -> MessageResponse:
    """
    Terminate the user session.

    Args:
        response (Response): FastAPI response object (for setting cookies).

    Action:
        - Clears the 'refresh_token' cookie.
        - Clears the 'is_logged_in' client-side indicator cookie.
    """
    response.delete_cookie('refresh_token')
    response.delete_cookie('is_logged_in')
    return MessageResponse(message="Successfully logged out")


@router.get('/auth/verify')
async def route_verify_access_token(token: Optional[str] = Depends(get_current_token)) -> MessageResponse:
    """
    Validate the current Access Token.

    This endpoint is used by the frontend on load to determine
    if the user's cached token is still valid.
    """
    token_data = get_token_data(token, "access")

    return MessageResponse(message=f'Token is valid for user {token_data.email}')


@router.post('/auth/refresh')
async def route_refresh_access_token(request: Request) -> Token:
    """
    Exchange a valid Refresh Token for a new Access Token.

    This allows the frontend to maintain a session without re-prompting the user
    for credentials, as long as the HTTP-only refresh cookie is valid.

    Args:
        request (Request): FastAPI request object (for getting cookies).

    Returns:
        Token: A new Access Token.

    Raises:
        HTTPException (401): If the refresh token is missing or expired.
    """
    # Retrieve the refresh token from the secure cookie
    refresh_token = request.cookies.get("refresh_token")

    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Validate the token and extract the username
    token_data = get_token_data(refresh_token, "refresh")

    access_token = create_access_token(data={"sub": token_data.email})
    return Token(email=token_data.email, access_token=access_token)