#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
__init__.py

Central file for exporting all SQLModel database models.
This ensures Alembic and the application can discover all tables from a single import.
"""

# Import all models so they register with SQLModel.metadata
from .user import User
from .employee import Employee, EmployeePosition
from .position import Position
from .shift import Shift
from .time_off import TimeOffRequest
from .schedule import ScheduleDraft

__all__ = [
    "User",
    "Employee",
    "EmployeePosition",
    "Position",
    "Shift",
    "TimeOffRequest",
    "ScheduleDraft",
]