"""
Router for account backend.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel

from backend.database.database import User
from backend.models.account_models import AccountDataResponse, PasswordResetRequest
from backend.utils.auth.auth import update_password
from backend.utils.auth.auth_users import get_authenticated_user, get_current_active_user

# Create router for this class to be referenced by main.
router = APIRouter()


class PredictionHistoryPayload(BaseModel):
    """
    A base model representing a prediction string to be added for a user.
    """
    prediction_string: str


class PredictionHistoryResponse(BaseModel):
    """
    A base model for a response to the prediction history request.
    """
    prediction_string: str
    created_at: datetime


@router.get('/account/info')
async def info_user(user: User = Depends(get_current_active_user)) -> AccountDataResponse:
    """
    Endpoint to get the current user information.
    """

    return AccountDataResponse(username=user.username, email=user.email,
                               last_login=user.last_login, creation_date=user.created_at)


@router.post('/account/change-password')
async def reset_password(data: PasswordResetRequest,
                         user: User = Depends(get_current_active_user)):
    """
    Endpoint to handle password reset requests.
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

    return {"message": "Password reset successful"}
