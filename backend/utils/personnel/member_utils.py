#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
member_utils.py

Utilities for safely adding, retrieving, and deleting members.
"""
from typing import List

from fastapi import HTTPException
from starlette import status

from backend.database.member_qualification_queries import database_add_member_quals
from backend.database.member_queries import database_get_members, database_get_member_by_names, database_add_member, database_del_member
from backend.models.member_models import MemberQueryResponse, MemberAddRequest, MemberDeleteRequest
from backend.utils.personnel.member_model_utils import build_members_response_model


def get_members() -> List[MemberQueryResponse]:
    """
    Get list of members and create query response list.
    :return: List of member query response data
    """
    members = database_get_members()
    query_response = build_members_response_model(members)
    return query_response


def add_member(member_data: MemberAddRequest) -> MemberQueryResponse:
    """
    Validate member add request, add quals, and return member response.
    :return: Member query response data of user.
    """
    member = database_get_member_by_names(member_data.first_name,
                                          member_data.last_name,
                                          member_data.middle_name,
                                          member_data.email)

    if member is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Member already exists",
                            headers={"WWW-Authenticate": "Bearer"})

    member = database_add_member(member_data)
    member_quals = database_add_member_quals(member, member_data.quals)

    qual_ids = []

    for qual in member_quals:
        qual_ids.append(qual.qualification_id)

    return MemberQueryResponse(id=member.id,
        first_name=member.first_name,
        middle_name=member.middle_name,
        last_name=member.last_name,
        email=member.email,
        quals=qual_ids
        )


def delete_members(members: List[MemberDeleteRequest]):
    """
    Delete list of members from the database
    :param members: List of member ids
    """
    database_del_member([member.id for member in members])