#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
members_queries.py

Module containing functions to perform queries on member table.
"""
from datetime import datetime
from typing import Sequence, Optional, List

from sqlmodel import Session, select, delete

from backend.database.database import Member, engine
from backend.models.member_models import MemberAddRequest


def database_get_members() -> Sequence[Member]:
    """
    Get list of all members
    :return: member list
    """
    with Session(engine) as session:
        statement = select(Member)
        members = session.exec(statement).all()
        return members


def database_get_member_by_names(first_name: str, last_name: str, middle_name: str, email: str) -> Optional[Member]:
    """
    Get a member from names and emails (mainly used for checking if a user already exists).
    This will likely be reworked in the future.
    :param first_name: member's first name
    :param last_name: member's last name
    :param middle_name: member's middle name
    :param email: member's email
    :return: Member if exists
    """
    with Session(engine) as session:
        statement = select(Member).where(Member.first_name == first_name
                                         ).where(Member.last_name == last_name
                                         ).where(Member.middle_name == middle_name
                                         ).where(Member.email == email)
        member = session.exec(statement).one_or_none()
        return member


def database_get_member_by_id(member_id: int) -> Optional[Member]:
    """
    Get a member by id
    :param member_id: id of member
    :return: Member if exists
    """
    with Session(engine) as session:
        statement = select(Member).where(Member.id == member_id)
        member = session.exec(statement).one_or_none()
        return member


def database_add_member(member_data: MemberAddRequest) -> Member:
    """
    Add a member to the database
    :param member_data: Data of member to be added
    :return: Instance of new member
    """
    with Session(engine) as session:
        member = Member(first_name=member_data.first_name,
                        last_name=member_data.last_name,
                        middle_name=member_data.middle_name,
                        email=member_data.email,
                        created_at=datetime.now())

        session.add(member)
        session.commit()

        session.refresh(member)
        return member


def database_del_member(member_ids: List[int]):
    """
    Delete members from teh database
    :param member_ids: ids of members to be deleted
    """
    with Session(engine) as session:
        for id in member_ids:
            statement = delete(Member).where(Member.id == id)
            session.exec(statement)
        session.commit()
