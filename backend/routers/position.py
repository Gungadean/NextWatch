#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
position.py

This module defines the API router for Position (Job Role) management.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from starlette import status

from database.database import get_session
from database.models import User, Position
from database.models.position import PositionRequirement
from schemas.generic_schemas import MessageResponse
from schemas.position_schemas import PositionAddRequest, PositionDeleteRequest, \
    PositionQueryResponse, PositionRequirementRead, PositionRequirementCreate, PositionWithRequirementsRead
from utils.auth.auth_users_utils import require_admin, get_current_active_user

router = APIRouter()


@router.get('/positions')
async def route_list_positions(
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
) -> List[PositionWithRequirementsRead]:
    """
    Retrieve a list of all available job positions.

    Args:
        user (User): The currently authenticated user (dependency injection).
        session (Session): Database session dependency.

    Returns:
        List[PositionQueryResponse]: A list of position objects.
    """
    statement = (
        select(Position, User.email)
        .where(Position.is_active == True)
        .join(User, Position.created_by == User.id, isouter=True)
        .options(
            selectinload(Position.requirements).selectinload(PositionRequirement.shift_template)
        )
    )

    results = session.exec(statement).all()

    positions_with_names = []
    for position, username in results:
        positions_with_names.append(
            PositionWithRequirementsRead(
                id=position.id,
                name=position.name,
                description=position.description,
                color=position.color,
                created_at=position.created_at,
                created_by=username,
                requirements=position.requirements
            )
        )

    return positions_with_names


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
        Position.is_active == True,
        Position.id == position_id
    ).join(User, Position.created_by == User.id))

    position = session.exec(statement).one_or_none()
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Position not found")

    return position


@router.post('/positions/add')
async def route_add_position(
        data: PositionAddRequest,
        admin: User = Depends(require_admin),
        session: Session = Depends(get_session)
) -> PositionQueryResponse:
    """
    Create a new job position.

    This endpoint automatically links the created position to the user who
    initiated the request (for auditing purposes).

    Args:
        data (PositionAddRequest): The payload containing name and description.
        admin (User): The currently authenticated user (creator).
        session (Session): Database session dependency.

    Returns:
        PositionQueryResponse: The newly created position object.
    """
    statement = select(Position.id).where(Position.name == data.name)

    if session.exec(statement).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Position already exists"
                            )

    position = Position(
        name=data.name,
        description=data.description,
        color=data.color,
        created_by=admin.id
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
        created_by=admin.email
    )

@router.patch("/positions/{position_id}/update")
async def route_update_position(
        position_id: int,
        data: PositionAddRequest,
        admin: User = Depends(require_admin),
        session: Session = Depends(get_session)
):
    """
    Update an existing positions details.

    Args:
        position_id (int): The ID of the position to update.
        data (PositionAddRequest): The updated details.
        admin (User): Authentication dependency.
        session (Session): Database session dependency.

    Returns:
        PositionQueryResponse: The fully updated position object.
    """
    statement = select(Position).where(Position.id == position_id)
    position = session.exec(statement).one_or_none()

    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Position not found"
        )

    # Update the basic text fields
    position.name = data.name
    position.description = data.description
    position.color = data.color

    # Save and commit the changes
    session.add(position)
    session.commit()
    session.refresh(position)

    return PositionQueryResponse(
        id=position.id,
        name=position.name,
        description=position.description,
        color=position.color,
        created_at=position.created_at,
        created_by=admin.email
    )

@router.post('/positions/delete')
async def route_delete_position(
        data: List[PositionDeleteRequest],
        admin: User = Depends(require_admin),
        session: Session = Depends(get_session)
):
    """
    Delete one or more positions from the database.

    Args:
        data (List[PositionDeleteRequest]): A list of objects containing IDs to delete.
        admin (User): The currently authenticated user.
        session (Session): Database session dependency.
    """
    ids_to_delete = [req.id for req in data]

    if not ids_to_delete:
        return MessageResponse(message="No positions to delete.")

    positions_to_delete = session.exec(select(Position).where(Position.id.in_(ids_to_delete))).all()

    for position in positions_to_delete:
        position.is_active = False
        session.add(position)

    session.commit()
    return MessageResponse(message="Positions deleted successfully")


@router.post("/positions/{position_id}/requirements", response_model=PositionRequirementRead)
def create_position_requirement(
        position_id: int,
        req_in: PositionRequirementCreate,
        admin: User = Depends(require_admin),
        session: Session = Depends(get_session)
):
    """Map a time block to a position with specific rules."""
    # Verify position exists
    position = session.get(Position, position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    db_req = PositionRequirement(position_id=position_id, **req_in.model_dump())
    session.add(db_req)
    session.commit()
    session.refresh(db_req)

    # Eager load the relationship for the return payload
    session.refresh(db_req, ["shift_template"])
    return db_req


@router.delete("/positions/{position_id}/requirements/{req_id}")
def delete_position_requirement(
        position_id: int,
        req_id: int,
        admin: User = Depends(require_admin),
        session: Session = Depends(get_session)
):
    """Remove a shift mapping from a position."""
    db_req = session.get(PositionRequirement, req_id)
    if not db_req or db_req.position_id != position_id:
        raise HTTPException(status_code=404, detail="Requirement not found")

    session.delete(db_req)
    session.commit()
    return {"message": "Requirement deleted successfully"}