#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
employee.py

This module defines the API router for personnel management.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from starlette import status

from database.database import get_session
from database.models import Employee, Position, User
from schemas.employee_schemas import EmployeeAddRequest, EmployeeDeleteRequest, EmployeeReadWithTimeOff
from schemas.generic_schemas import MessageResponse
from utils.auth.auth_users_utils import get_current_active_user

router = APIRouter()


@router.get("/employees", response_model=List[EmployeeReadWithTimeOff])
async def route_read_employees(
        include_time_off: bool = False,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Retrieve a list of all employees.

    Args:
        include_time_off (bool): If True, also eagerly loads time off requests.
        user (User): Authentication dependency (admin/manager check usually implied).
        session (Session): Database session dependency.

    Returns:
        List[EmployeeReadWithTimeOff]: List of employees with populated relationship fields.
    """
    # Always load 'positions' as it is required by the response model schema
    statement = select(Employee).options(selectinload(Employee.positions))

    # Only join the time_off_requests table if explicitly asked.
    if include_time_off:
        statement = statement.options(selectinload(Employee.time_off_requests))

    employees = session.exec(statement).all()

    # If we didn't load time_off_requests, accessing the property on the model
    # would trigger a lazy load query for every employee (N+1 problem).
    # We manually set it to an empty list here to satisfy the Pydantic model
    if not include_time_off:
        for employee in employees:
            employee.time_off_requests = []

    return employees


@router.get("/employees/{employee_id}", response_model=EmployeeReadWithTimeOff)
async def route_get_employee(
        employee_id: int,
        session: Session = Depends(get_session)
) -> Employee:
    """
    Retrieve a single employee by ID, including all related data (Positions & Time Off).

    Args:
        employee_id (int): ID of the employee to retrieve.
        session (Session): Database session dependency.

    Returns:
        EmployeeReadWithTimeOff: An employee with populated relationship fields.

    Raises:
        HTTPException (404): If the employee does not exist.
    """
    # Eagerly load both relationships
    statement = select(Employee).where(Employee.id == employee_id).options(
        selectinload(Employee.positions),
        selectinload(Employee.time_off_requests)
    )
    employee = session.exec(statement).one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return employee


@router.post("/employees/add", response_model=EmployeeReadWithTimeOff)
async def route_add_employee(
        data: EmployeeAddRequest,
        session: Session = Depends(get_session)
) -> Employee:
    """
    Create a new employee record.

    Args:
        data (EmployeeAddRequest): Data for new employee to be added.
        session (Session): Database session dependency.

    Returns:
        EmployeeReadWithTimeOff: The employee who was added with populated relationship fields.

    Raises:
        HTTPException (409): If the employee already exists.
    """
    statement = select(Employee.id).where(
        Employee.first_name == data.first_name,
        Employee.last_name == data.last_name,
        Employee.middle_name == data.middle_name,
        Employee.email == data.email
    )

    if session.exec(statement).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Employee already exists",
                            headers={"WWW-Authenticate": "Bearer"})

    position_statement = select(Position).where(Position.id.in_(data.positions))
    positions_to_link = session.exec(position_statement).all()

    if len(positions_to_link) != len(data.positions):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more specified positions could not be found."
        )

    employee = Employee(
        first_name=data.first_name,
        last_name=data.last_name,
        middle_name=data.middle_name,
        email=data.email,
        positions=positions_to_link
    )

    session.add(employee)
    session.commit()

    # Re-fetch using injected session to populate relationships
    statement = select(Employee).where(Employee.id == employee.id).options(
        selectinload(Employee.positions),
        selectinload(Employee.time_off_requests)
    )
    full_employee = session.exec(statement).one()
    return full_employee


@router.post("/employees/delete")
async def route_delete_employees(data: List[EmployeeDeleteRequest], session: Session = Depends(get_session)):
    """
    Delete one or more employees.

    Args:
        data (List[EmployeeDeleteRequest]): List of objects containing IDs to delete.

    Returns:
        MessageResponse: That deletion was successful.
    """
    ids_to_delete = [req.id for req in data]
    if not ids_to_delete:
        return MessageResponse(message="No employees to delete.")

    # Fetch all employees to be deleted in a single query
    employees_to_delete = session.exec(select(Employee).where(Employee.id.in_(ids_to_delete))).all()

    for employee in employees_to_delete:
        session.delete(employee)

    # Commit the single transaction
    session.commit()
    return MessageResponse(message="Employees deleted successfully")