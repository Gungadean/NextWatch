#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
database.py

Create models for database and then generate local database file.
"""
from datetime import datetime
from typing import List, Optional

from sqlmodel import SQLModel, create_engine, Field, Relationship


class User(SQLModel, table=True):
    """
    SQLModel representing a user in the database.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(..., max_length=50)
    email: str = Field(..., max_length=50)
    password_hashed: str = Field(..., max_length=50)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default=None)
    last_login: datetime = Field(default=None)

    member: Optional["Member"] = Relationship(back_populates="user")


class MemberQualification(SQLModel, table=True):
    """
    SQLModel representing a qualification in the database.
    """
    member_id: Optional[int] = Field(
        primary_key=True,
        default=None,
        foreign_key="member.id",
        ondelete="CASCADE")
    qualification_id: Optional[int] = Field(
        primary_key=True,
        default=None,
        foreign_key="qualification.id",
        ondelete="CASCADE")


class Qualification(SQLModel, table=True):
    """
    SQLModel representing a qualification in the database.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(..., max_length=50)
    description: str = Field(..., max_length=1000)
    created_at: datetime = Field(default=None)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")

    members: Optional[List["Member"]] = Relationship(
        back_populates="qualifications",
        link_model=MemberQualification)


class Member(SQLModel, table=True):
    """
    SQLModel representing member in the database.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    middle_name: str = Field(..., max_length=50)
    email: str = Field(..., max_length=50)
    created_at: datetime = Field(default=None)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")

    user: Optional[User] = Relationship(back_populates="member")
    qualifications: Optional[List[Qualification]] = Relationship(
        back_populates="members",
        link_model=MemberQualification)


# Create engine from database location and create all SQLModel tables.
engine = create_engine("sqlite:///database.db")
SQLModel.metadata.create_all(engine)