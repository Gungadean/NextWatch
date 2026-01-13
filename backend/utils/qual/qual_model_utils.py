#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
qual_model_utils.py

Utilities for converting to qualification models.
"""
from typing import List, Sequence, Any

from backend.database.database import Qualification
from backend.models.qualification_models import QualificationResponse


def build_quals_response_model(qualification_username: Sequence[Any]) -> List[QualificationResponse]:
    """
    Convert list of database Qualification model to list of QualificationResponse model.
    :param qualification_username: (Sequence[List[Qualification], username: str]) to be unpacked.
    :return: (List[QualificationResponse]) List of response objects.
    """
    qualifications = []
    for qual, username in qualification_username:
        qualifications.append(build_qual_response_model(qual, username))
    return qualifications


def build_qual_response_model(qualification: Qualification, username: str) -> QualificationResponse:
    """
    Convert database Qualification model to QualificationResponse model.
    :param qualification: (Qualification) Original qualification to be mapped.
    :param username: (str) Username of creator.
    :return:
    """
    return QualificationResponse(
        id=qualification.id,
        name=qualification.name,
        description=qualification.description,
        created_by=username,
        created_at=qualification.created_at)