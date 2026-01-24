#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
quals_utils.py

Utilities for safely adding, retrieving, and deleting qualifications.
"""

from fastapi import HTTPException
from starlette import status

from backend.database.database import User
from backend.database.qualification_queries import database_get_qualification_by_name, \
    database_add_qualification, database_get_qualification_by_id
from backend.models.qualification_models import QualificationQueryResponse


def get_qualification(qualification_id: int) -> QualificationQueryResponse:
    """
    Get qualification and perform check to see if qualification exists.
    :param qualification_id: (int) Id of qualification to be retrieved.
    :return: (QualificationQueryResponse) Qualification that was successfully retrieved.
    :raise: HTTPException: If qualification does not exists.
    """
    qualification = database_get_qualification_by_id(qualification_id)

    if qualification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Qualification not found",
                            headers={"WWW-Authenticate": "Bearer"})
    return qualification


def add_qualification(name: str, description: str, created_by: User) -> QualificationQueryResponse:
    """
    Add a qualification and perform checks to make sure qualification is not a duplicate.
    :param name: (str) Name of qualification to be added.
    :param description: (str) Description of qualification to be added.
    :param created_by: (User) User who created the qualification.
    :return: (QualificationQueryResponse) Qualification that was successfully added.
    :raise: HTTPException: If qualification already exists.
    """
    qualification = database_get_qualification_by_name(name)

    if qualification is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Qualification already exists",
                            headers={"WWW-Authenticate": "Bearer"})

    qualification = database_add_qualification(name=name, description=description, created_by=created_by)
    return qualification