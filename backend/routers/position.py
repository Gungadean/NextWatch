#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
position.py

This module defines the API router for Position (Job Role) management.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete
from sqlmodel import Session, select
from starlette import status

from backend.database.database import User, get_session, Position
from backend.schemas.position_schemas import PositionAddRequest, PositionDeleteRequest, \
    PositionQueryResponse
from backend.utils.auth.auth_users_utils import get_current_active_user

router = APIRouter()


@router.get('/positions')
async def route_list_positions(
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
) -> List[PositionQueryResponse]:
    """
    Retrieve a list of all available job positions.

    Args:
        user (User): The currently authenticated user (dependency injection).
        session (Session): Database session dependency.

    Returns:
        List[PositionQueryResponse]: A list of position objects.
    """
    statement = select(
        Position.id,
        Position.name,
        Position.color,
        Position.description,
        Position.created_at,
        User.username.label("created_by")
    ).join(User, Position.created_by == User.id)

    return session.exec(statement).all()


@router.get('/positions/{position_id}')
async def route_get_position(
        position_id: int,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
) -> PositionQueryResponse:
    """
    Retrieve details for a specific position by its ID.

    Args:
        position_id (int): The unique ID of the position to query.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.

    Returns:
        PositionQueryResponse: The requested position details.
    """
    statement = (select(
        Position.id,
        Position.name,
        Position.color,
        Position.description,
        Position.created_at,
        User.username.label("created_by")
    ).where(
        Position.id == position_id
    ).join(User, Position.created_by == User.id))

    position = session.exec(statement).one_or_none()
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Position not found",
                            headers={"WWW-Authenticate": "Bearer"})

    return position


@router.post('/positions/add')
async def route_add_position(
        data: PositionAddRequest,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
) -> PositionQueryResponse:
    """
    Create a new job position.

    This endpoint automatically links the created position to the user who
    initiated the request (for auditing purposes).

    Args:
        data (PositionAddRequest): The payload containing name and description.
        user (User): The currently authenticated user (creator).
        session (Session): Database session dependency.

    Returns:
        PositionQueryResponse: The newly created position object.
    """
    statement = select(Position.id).where(Position.name == data.name)

    if session.exec(statement).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Position already exists",
                            headers={"WWW-Authenticate": "Bearer"})

    position = Position(
        name=data.name,
        description=data.description,
        color=data.color,
        created_by=user.id
    )

    session.add(position)
    session.commit()
    session.refresh(position)

    return PositionQueryResponse(
        id=position.id,
        name=position.name,
        description=position.description,
        color=position.color,
        created_at=position.created_at,
        created_by=user.username
    )



@router.delete('/positions/delete')
async def route_delete_position(
        data: List[PositionDeleteRequest],
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
) -> None:
    """
    Delete one or more positions from the database.

    Args:
        data (List[PositionDeleteRequest]): A list of objects containing IDs to delete.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.
    """
    for position_id in data:
        statement = delete(Position).where(Position.id == position_id.id)
        session.exec(statement)
    session.commit()