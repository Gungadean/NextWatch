#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
auth.py

Router for authenticating with backend.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, status, HTTPException, Response, Request
from fastapi.security import OAuth2PasswordRequestForm

from backend.models.auth_models import RegisterRequest, Token
from backend.models.generic_models import MessageResponse
from backend.utils.auth.auth_tokens_utils import create_tokens, get_current_token, \
    create_access_token, get_token_data
from backend.utils.auth.auth_users_utils import get_authenticated_user, check_user_exists, check_user_email_exists, \
    create_user

router = APIRouter()


@router.post('/auth/login')
async def route_login_user(response: Response,
                     form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> Token:
    """
    Endpoint to handle a user login request using OAuth2 standards.
    :param response: Response object for setting session cookies.
    :param form_data: OAuth2 compliant form data for authentication.
    :return: Token for new session if login is valid.
    :raise: HTTPException: If login attempt fails.
    """
    # Attempt to get an authenticated user based off of the supplied data.
    user = get_authenticated_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    # User successfully authenticated, add refresh token as cookie and return access token.
    access_token = create_tokens(data={"sub": user.username}, response=response)

    return Token(username=user.username, access_token=access_token)


@router.post('/auth/register')
async def route_register_user(response: Response, register_data: RegisterRequest) -> Token:
    """
    Endpoint to handle a user register request.
    :param response: Response object for setting session cookies.
    :param register_data: Model representing new user registration info.
    :return: Token for new session if user is successfully registered.
    :raise: HTTPException: If user with matching data already exists.
    """
    # Determine if a user with this username already exists.
    if check_user_exists(register_data.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
            headers={"WWW-Authenticate": "Bearer"}
        )
    # Determine if a user with this email already exists.
    if check_user_email_exists(register_data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Create user and then generate an access and refresh tokens and add as cookies.
    create_user(register_data.username, register_data.email, register_data.password)
    access_token = create_tokens(data={"sub": register_data.username}, response=response)

    return Token(username=register_data.username, access_token=access_token)


@router.post('/auth/logout')
async def route_logout_user(response: Response) -> MessageResponse:
    """
    Endpoint to handle a user logout request.
    :param response: Response object for setting session cookies.
    :return: Message that log out was successful.
    """
    response.delete_cookie('refresh_token')
    response.delete_cookie('is_logged_in')
    return MessageResponse(message="Successfully logged out")


@router.get('/auth/verify')
async def route_verify_access_token(token: Optional[str] = Depends(get_current_token)) -> MessageResponse:
    """
    Verify submitted user token is valid.
    :param token: Token to be verified.
    :return: Message if user token is valid.
    """
    token_data = get_token_data(token, "access")

    return MessageResponse(message=f'Token is valid for user {token_data.username}')


@router.post('/auth/refresh')
async def route_refresh_access_token(request: Request) -> Token:
    """
    Refresh user token
    :param request: Response object for retrieving refresh token.
    :return: New access token if refresh token is still valid.
    """
    refresh_token = request.cookies.get("refresh_token")

    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # If the token is expired, then the user needs to log in again.
    token_data = get_token_data(refresh_token, "refresh")

    access_token = create_access_token(data={"sub": token_data.username})
    return Token(username=token_data.username, access_token=access_token)