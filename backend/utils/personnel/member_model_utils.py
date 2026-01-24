#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
member_model_utils.py

Utilities for converting to qualification models.
"""
from typing import List, Sequence

from backend.database.database import Member
from backend.database.member_qualification_queries import database_get_member_quals
from backend.models.member_models import MemberQueryResponse


def build_members_response_model(raw_members: Sequence[Member]) -> List[MemberQueryResponse]:
    """
    Convert list of database Member model to list of MemberQueryResponse model.
    :param members_quals: A list of members and their quals to be unpacked.
    :return: List of response objects.
    """
    members = []

    for member in raw_members:
        members.append(build_member_response_model(member))
    return members


def build_member_response_model(member: Member) -> MemberQueryResponse:
    """
    Convert database Member model to MemberQueryResponse model.
    :param member: Original member to be mapped.
    :return:
    """
    quals = database_get_member_quals(member)

    return MemberQueryResponse(
        id=member.id,
        first_name=member.first_name,
        last_name=member.last_name,
        middle_name=member.middle_name,
        email=member.email,
        quals=[qual.id for qual in quals])