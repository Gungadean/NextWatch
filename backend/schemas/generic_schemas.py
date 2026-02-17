#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
generic_schemas.py

This module defines generic Pydantic models (Schemas) used across multiple API endpoints.
These are typically used for simple status messages rather than complex data objects.
"""
from pydantic import BaseModel


class MessageResponse(BaseModel):
    """
    Standard response model for returning simple text messages.

    Used by endpoints that perform an action (like 'Logout' or 'Reset Password')
    but do not need to return a data payload.
    """
    message: str