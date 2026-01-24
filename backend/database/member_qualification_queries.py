#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
member_qualification_queries.py

Module containing functions to perform queries on MemberQualification table.
"""
from typing import Sequence, List

from sqlmodel import Session, select

from backend.database.database import MemberQualification, engine, Member


def database_get_member_quals(member: Member) -> Sequence[MemberQualification]:
    """
    Query database for quals of a specific member.
    :return:
    """
    with (Session(engine) as session):
        statement = select(MemberQualification).where(MemberQualification.member_id == member.id)
        qualifications = session.exec(statement).all()

        return qualifications


def database_add_member_quals(member: Member, qualifications: List[int]) -> List[MemberQualification]:
    """
    Add quals (ignores duplicates) for a member.
    :param member:
    :param qualifications:
    :return:
    """
    member_quals = [qual.qualification for qual in database_get_member_quals(member)]

    filtered_quals = []

    for qual in qualifications:
        if not qual in member_quals:
            filtered_quals.append(MemberQualification(member_id=member.id, qualification=qual))

    with Session(engine) as session:
        for qual in filtered_quals:
            session.add(qual)

        session.commit()

        for qual in filtered_quals:
            session.refresh(qual)

        return filtered_quals