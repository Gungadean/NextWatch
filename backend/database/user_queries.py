#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
user_queries.py

Module containing functions to perform user queries on the database.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from backend.database.database import engine, User


def get_user_username(username: str) -> Optional[User]:
    """
    Get a user based on their username.
    :param username: Username of the user to be retrieved.
    :return: User instance, if exists.
    """
    with Session(engine) as session:
        if username is not None:
            statement = select(User).where(User.username == username)
            user = session.exec(statement).first()
            return user
        return None


def get_user_email(email: str) -> Optional[User]:
    """
    Get a user based on their email.
    :param email: Email of the user to be retrieved.
    :return: User instance, if exists.
    """
    with Session(engine) as session:
        if email is not None:
            statement = select(User).where(User.email == email)
            user = session.exec(statement).first()
            return user
        return None


def database_create_user(username: str, email: str, password: str) -> User:
    """
    Create a user in the database with the supplied username, email, and hashed password.
    :param username: Username of the user to be created.
    :param email: Email of the user to be created.
    :param password: Password of the user to be created.
    :return: User instance, if exists.
    """
    with Session(engine) as session:
        user = User(username=username, email=email,
                         password_hashed=password,
                         created_at=datetime.now(timezone.utc), last_login=datetime.now(timezone.utc))
        session.add(user)
        session.commit()

        session.refresh(user)
        return user


def database_update_login_time(email: str) -> User:
    """
    Update the last login time for the user.
    :param email: Email of the user to be updated.
    :return: Updated User instance.
    """
    with Session(engine) as session:
        user = get_user_email(email)
        user.last_login = datetime.now(timezone.utc)
        session.add(user)
        session.commit()

        session.refresh(user)
        return user


def database_update_password(email: str, password_hashed: str) -> User:
    """
    Updated the password for the supplied email's user.
    :param email: Email of the user to be updated.
    :param password_hashed: Hashed password to replace current password.
    :return: Updated User instance.
    """
    with Session(engine) as session:
        user = get_user_email(email)
        user.password_hashed = password_hashed
        session.add(user)
        session.commit()

        session.refresh(user)
        return user
