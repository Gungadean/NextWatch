#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston
from datetime import datetime
from typing import Optional, List

from sqlmodel import SQLModel, Field, Relationship


class EmployeePosition(SQLModel, table=True):
    """
    Association (Link) Table for the Many-to-Many relationship
    between Employees and Positions.
    """
    employee_id: Optional[int] = Field(
        primary_key=True,
        default=None,
        foreign_key="employee.id",
        ondelete="CASCADE")
    position_id: Optional[int] = Field(
        primary_key=True,
        default=None,
        foreign_key="position.id",
        ondelete="CASCADE")


class Employee(SQLModel, table=True):
    """
    Represents an employee profile.

    Contains personal info and links to the authentication User model.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    middle_name: str = Field(..., max_length=50)
    email: str = Field(..., max_length=50)
    created_at: datetime = Field(default_factory=datetime.now)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")

    # Link to auth user (optional, as an employee might exist without a login)
    user: Optional["User"] = Relationship(back_populates="employee")

    # Many-to-Many relationship to Position
    positions: Optional[List["Position"]] = Relationship(
        back_populates="employees",
        link_model=EmployeePosition)

    shifts: List["Shift"] = Relationship(back_populates="employee")
    time_off_requests: List["TimeOffRequest"] = Relationship(back_populates="employee")