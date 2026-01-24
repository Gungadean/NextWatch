#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
member.py

Router for personnel handling.
"""
from typing import List, Sequence

from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from backend.database.database import User
from backend.database.member_queries import database_get_member_by_id
from backend.models.member_models import MemberQueryResponse, MemberAddRequest, MemberDeleteRequest
from backend.utils.auth.auth_users_utils import get_current_active_user
from backend.utils.personnel.member_utils import get_members, add_member, delete_members

router = APIRouter()


@router.get("/personnel/list")
async def router_list_personnel(user: User = Depends(get_current_active_user)) -> List[MemberQueryResponse]:
    """
    Endpoint for retrieving a list of all current members and their quals.
    :param user: user making request
    :return: List of all members
    """
    return get_members()


@router.get("/personnel/{member_id}")
async def router_get_member(member_id: int) -> MemberQueryResponse:
    """
    Endpoint for retrieving user data using their member id.
    :param member_id: id of user
    :return: Query response with data.
    """
    member = database_get_member_by_id(member_id)

    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Member not found",
                            headers={"WWW-Authenticate": "Bearer"})

    return MemberQueryResponse(
        id=member.id,
        first_name=member.first_name,
        middle_name=member.middle_name,
        last_name=member.last_name,
        email=member.email
    )


@router.post("/personnel/add")
async def router_add_member(data: MemberAddRequest) -> MemberQueryResponse:
    """
    Endpoint for adding a new member with their quals.
    :param data: Member data
    :return: Instance of member created
    """
    member = add_member(data)
    return member


@router.post("/personnel/delete")
async def router_delete_member(data: List[MemberDeleteRequest]):
    """
    Endpoint for deleting a list of users
    :param data: List of members ids
    :return: Success message
    """
    delete_members(data)