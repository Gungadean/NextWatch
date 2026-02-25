#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
request.py

This module defines the API router for handling Time Off Requests (Vacation, Sick Leave, etc.).
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from starlette import status

from database.models import User, TimeOffRequest
from schemas.generic_schemas import MessageResponse
from schemas.request_schemas import TimeOffAddRequest, TimeOffResponsePublic
from utils.auth.auth_users_utils import get_current_active_user
from database.database import get_session
from utils.request.request_utils import sanitize_request

router = APIRouter()

@router.get("/requests", response_model=List[TimeOffResponsePublic])
async def route_list_requests(user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    """
    Retrieve a list of all time-off requests.

    Args:
        user (User): The currently authenticated user (dependency injection).
        session (Session): Database session dependency.

    Returns:
        List[TimeOffResponsePublic]: A list of requests, sanitized to hide sensitive
        details if necessary (depending on user role).
    """
    stmt = select(TimeOffRequest).options(selectinload(TimeOffRequest.employee))

    requests = session.exec(stmt).all()

    return [sanitize_request(request, user, session) for request in requests]


@router.post("/requests/add", response_model=TimeOffResponsePublic)
async def route_add_request(data: TimeOffAddRequest, user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    """
    Submit a new time-off request.

    Args:
        data (TimeOffAddRequest): The request payload.
        user (User): The currently authenticated user (dependency injection).
        session (Session): Database session dependency.

    Validation:
        Checks for overlapping requests for the same employee that are either
        'Pending' or 'Approved'.

    Raises:
        HTTPException (400): If a conflicting request exists in the given date range.
    """
    # Check for any request overlaps for current employee
    stmt = select(func.count()).where(TimeOffRequest.employee_id == data.employee_id,
                                        TimeOffRequest.start_date <= data.end_date,
                                        TimeOffRequest.end_date >= data.start_date,
                                        TimeOffRequest.status.in_(["Pending", "Approved"]))

    requests_count = session.exec(stmt).one()

    if requests_count > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="This employee already has an approved or pending request during this time period.")

    request = TimeOffRequest(
        employee_id=data.employee_id,
        start_date=data.start_date,
        end_date=data.end_date,
        request_type=data.request_type
    )

    session.add(request)
    session.commit()

    # Re-fetch the request with the employee relationship loaded.
    fetch_stmt = (select(TimeOffRequest)
                  .where(TimeOffRequest.id == request.id)
                  .options(selectinload(TimeOffRequest.employee)))

    loaded_request = session.exec(fetch_stmt).one()

    return sanitize_request(loaded_request, user, session)


@router.delete("/requests/{request_id}/delete")
async def route_delete_request(request_id: int, user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    """
    Delete a specific time-off request.

    Args:
        request_id (int): The ID of the request to remove.
        user (User): The currently authenticated user (dependency injection).
        session (Session): Database session dependency.

    Returns:
        MessageResponse: A confirmation message.
    """
    stmt = select(TimeOffRequest).where(TimeOffRequest.id == request_id)
    request = session.exec(stmt).one_or_none()

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    session.delete(request)
    session.commit()

    return MessageResponse(message="Request deleted successfully")


@router.get("/requests/{request_id}", response_model=TimeOffResponsePublic)
async def route_get_request(request_id: int, user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    """
    Retrieve details for a single time-off request.

    Args:
        request_id (int): The ID of the request to be retrieved.
        user (User): The currently authenticated user (dependency injection).
        session (Session): Database session dependency.

    Returns:
        TimeOffResponsePublic: The requested request object sanitized to hide sensitive details.
    """
    stmt = (select(TimeOffRequest)
                  .where(TimeOffRequest.id == request_id)
                  .options(selectinload(TimeOffRequest.employee)))

    request = session.exec(stmt).one_or_none()

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    return sanitize_request(request, user, session)


@router.patch("/requests/{request_id}/approve", response_model=TimeOffResponsePublic)
async def route_approve_request(request_id: int, user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    """
    Mark a time-off request as Approved.

    Args:
        request_id (int): The ID of the request to be approved.
        user (User): The currently authenticated user (dependency injection).
        session (Session): Database session dependency.

    Returns:
        TimeOffResponsePublic: The updated request object.
    """
    stmt = (select(TimeOffRequest)
                  .where(TimeOffRequest.id == request_id)
                  .options(selectinload(TimeOffRequest.employee)))
    request = session.exec(stmt).one_or_none()

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    request.status = "Approved"

    session.add(request)
    session.commit()

    # Re-fetch the request with the employee relationship loaded.
    fetch_stmt = (select(TimeOffRequest)
                  .where(TimeOffRequest.id == request.id)
                  .options(selectinload(TimeOffRequest.employee)))

    loaded_request = session.exec(fetch_stmt).one()

    return sanitize_request(loaded_request, user, session)


@router.patch("/requests/{request_id}/deny", response_model=TimeOffResponsePublic)
async def route_deny_request(request_id: int, user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    """
    Mark a time-off request as 'Denied'.

    Args:
        request_id (int): The ID of the request to be denied.
        user (User): The currently authenticated user (dependency injection).
        session (Session): Database session dependency.

    Returns:
        TimeOffResponsePublic: The updated request object.
    """
    stmt = select(TimeOffRequest).where(TimeOffRequest.id == request_id)
    request = session.exec(stmt).one_or_none()

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    request.status = "Denied"

    session.add(request)
    session.commit()

    # Re-fetch the request with the employee relationship loaded.
    fetch_stmt = (select(TimeOffRequest)
                  .where(TimeOffRequest.id == request.id)
                  .options(selectinload(TimeOffRequest.employee)))

    loaded_request = session.exec(fetch_stmt).one()

    return sanitize_request(loaded_request, user, session)