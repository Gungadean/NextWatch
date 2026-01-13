#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
qualification_queries.py

Module containing functions to perform queries on qualifications table.
"""
from datetime import datetime
from typing import List

from sqlmodel import Session, select, delete

from backend.database.database import engine, Qualification, User
from backend.models.qualification_models import QualificationResponse, QualificationDeleteRequest
from backend.utils.qual.qual_model_utils import build_qual_response_model, build_quals_response_model


def database_get_qualifications() -> List[QualificationResponse]:
    """
    Get all qualifications and convert to QualificationResponse model.
    :return: List of qualifications.
    """
    with Session(engine) as session:
        statement = select(Qualification, User.username).join(User, Qualification.created_by == User.id)
        raw_qual = session.exec(statement).all()

        quals = build_quals_response_model(raw_qual)

        return list(quals)


def database_get_qualification_by_id(qualification_id: int) -> QualificationResponse:
    """
    Get qualification by id.
    :param qualification_id: Id of qualification
    :return: Qualification from id, if exists.
    """
    with (Session(engine) as session):
        statement = select(Qualification).where(Qualification.id == qualification_id
                                                ).join(User, Qualification.created_by == User.id)
        raw_qual, user = session.exec(statement).one_or_none()

        qual = build_qual_response_model(raw_qual, user.username)

        return qual


def database_get_qualification_by_name(qualification_name: str) -> QualificationResponse:
    """
    Get qualification by name.
    :param qualification_name: Name of qualification
    :return: Qualification from name, if exists.
    """
    with (Session(engine) as session):
        statement = select(Qualification).where(Qualification.name == qualification_name
                                                ).join(User, Qualification.created_by == User.id)
        raw_qual, user = session.exec(statement).one_or_none()

        qual = build_qual_response_model(raw_qual, user.username)

        return qual


def database_add_qualification(name: str, description: str, created_by: User) -> QualificationResponse:
    """
    Add qualification to the database.
    :param name: Name of qualification
    :param description: Description of qualification
    :param created_by: Name of account who added qualification.
    :return: Resulting qualification.
    """
    with Session(engine) as session:
        qualification = Qualification(name=name,
                                      description=description,
                                      created_at=datetime.now(),
                                      created_by=created_by.id)
        session.add(qualification)
        session.commit()

        session.refresh(qualification)

        qualification = build_qual_response_model(qualification, created_by.username)
        return qualification


def database_del_qualifications(qualification_ids: List[QualificationDeleteRequest]) -> None:
    """
    Qualification to be deleted from database.
    :param qualification_ids: List of qualification ids.
    """
    with Session(engine) as session:
        for qualification_id in qualification_ids:
            statement = delete(Qualification).where(Qualification.id == qualification_id.id)
            session.exec(statement)
        session.commit()