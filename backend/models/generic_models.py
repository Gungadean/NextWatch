#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
generic_models.py

Module containing basic BaseModels for any endpoint.
"""
from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str