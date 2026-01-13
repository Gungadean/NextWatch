#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
qualification.py

Router for qualification handling.
"""

from typing import List

from fastapi import APIRouter, Depends

from backend.database.database import User
from backend.database.qualification_queries import database_add_qualification, \
    database_get_qualifications, database_del_qualifications
from backend.models.qualification_models import QualificationAddRequest, QualificationDeleteRequest, \
    QualificationResponse
from backend.utils.auth.auth_users_utils import get_current_active_user
from backend.utils.qual.qual_utils import get_qualification

router = APIRouter()


@router.get('/qual/list')
async def route_list_qualifications(user: User = Depends(get_current_active_user)) -> List[QualificationResponse]:
    """
    Get a list of all qualifications. Requires logged-in user.
    :param user: User making the request
    :return: List of qualifications
    :raise: HTTPException: If request is not from authorized user
    """
    return database_get_qualifications()


@router.get('/qual/{qualification_id}')
async def route_get_qualification(qualification_id: int,
                                  user: User = Depends(get_current_active_user)) -> QualificationResponse:
    """
    Get information about qualification by id.
    :param qualification_id: Qualification id to be queried
    :param user: User making the request
    :return: Qualification information
    :raise: HTTPException: If request is not from authorized user
    """
    return get_qualification(qualification_id)


@router.post('/qual/add')
async def route_add_qualification(data: QualificationAddRequest,
                                  user: User = Depends(get_current_active_user)) -> QualificationResponse:
    """
    Add a qualification to the database.
    :param data: Qualification data
    :param user: User making the request
    :return: Instance of qualification if successful
    :raise: HTTPException: If request is not from authorized user
    """
    qualification = database_add_qualification(name=data.name, description=data.description, created_by=user)
    return qualification



@router.post('/qual/delete')
async def route_delete_qualification(data: List[QualificationDeleteRequest],
                                     user: User = Depends(get_current_active_user)) -> None:
    """
    Delete a qualification from the database.
    :param data: List of qualifications to be deleted.
    :param user: User making the request
    :return: 200 response if successful
    :raise: HTTPException: If request is not from authorized user
    """
    database_del_qualifications(data)