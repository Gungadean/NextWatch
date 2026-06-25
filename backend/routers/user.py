#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
user.py

This module defines the API router for user management (Admin only).
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from database.database import get_session
from database.models import User, Employee
from schemas.generic_schemas import MessageResponse
from schemas.user_schemas import UserRead, UserCreate, UserUpdate
from utils.auth.auth_users_utils import require_admin
from utils.auth.auth_utils import get_password_hash

router = APIRouter()


@router.get('/users', response_model=List[UserRead])
async def get_all_users(
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin)
):
    """
    Retrieve all users. (Admin only)
    """
    users = session.exec(select(User)).all()
    result = []
    for user in users:
        emp_id = user.employee.id if user.employee else None
        result.append(UserRead(
            id=user.id,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login,
            employee_id=emp_id
        ))
    return result


@router.post('/users', response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin)
):
    """
    Create a new user. (Admin only)
    """
    existing_user = session.exec(select(User).where(User.email == data.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(data.password)
    new_user = User(
        email=data.email,
        password_hashed=hashed_password,
        role=data.role,
        is_active=data.is_active
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    if data.employee_id is not None:
        employee = session.get(Employee, data.employee_id)
        if employee:
            # Enforce 1-to-1
            existing_emp = session.exec(select(Employee).where(Employee.user_id == new_user.id)).first()
            if existing_emp:
                existing_emp.user_id = None
                session.add(existing_emp)
            
            employee.user_id = new_user.id
            session.add(employee)
            session.commit()
            session.refresh(new_user)

    emp_id = new_user.employee.id if new_user.employee else None
    return UserRead(
        id=new_user.id,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        last_login=new_user.last_login,
        employee_id=emp_id
    )


@router.put('/users/{user_id}', response_model=UserRead)
async def update_user(
    user_id: int,
    data: UserUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin)
):
    """
    Update a user. (Admin only)
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.email is not None:
        user.email = data.email
    if data.password is not None and data.password.strip():
        user.password_hashed = get_password_hash(data.password)
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active

    session.add(user)

    if data.employee_id is not None:
        # Clear out any existing employee linked to this user
        existing_emp = session.exec(select(Employee).where(Employee.user_id == user.id)).first()
        if existing_emp and existing_emp.id != data.employee_id:
            existing_emp.user_id = None
            session.add(existing_emp)
        
        # Link the new employee
        if data.employee_id > 0:
            employee = session.get(Employee, data.employee_id)
            if not employee:
                raise HTTPException(status_code=404, detail="Employee not found")
            employee.user_id = user.id
            session.add(employee)
        elif data.employee_id == 0:
            # A convention to clear the employee mapping
            pass

    session.commit()
    session.refresh(user)

    emp_id = user.employee.id if user.employee else None
    return UserRead(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
        employee_id=emp_id
    )


@router.delete('/users/{user_id}')
async def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin)
):
    """
    Delete a user. (Admin only)
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Unlink employee if any
    existing_emp = session.exec(select(Employee).where(Employee.user_id == user.id)).first()
    if existing_emp:
        existing_emp.user_id = None
        session.add(existing_emp)
        
    user.is_active = False
    session.add(user)
    session.commit()
    return MessageResponse(message="User deleted successfully")