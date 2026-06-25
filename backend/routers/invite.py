#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
invite.py

This module defines the API router for invite management.
"""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, APIRouter
from sqlmodel import Session, select

from database.database import get_session
from database.models import User, Employee, EmployeeInvite
from schemas.user_schemas import InviteCreateResponse, InviteValidateResponse
from utils.auth.auth_users_utils import require_admin

router = APIRouter()

@router.post('/invites/{employee_id}', response_model=InviteCreateResponse)
async def create_invite(
        employee_id: int,
        session: Session = Depends(get_session),
        admin: User = Depends(require_admin)
):
    """
    Create an invitation for an employee. (Admin only)
    """
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if employee.user_id:
        raise HTTPException(status_code=400, detail="Employee is already registered")

    # Delete existing invites for this employee
    existing_invites = session.exec(select(EmployeeInvite).where(EmployeeInvite.employee_id == employee_id)).all()
    for invite in existing_invites:
        session.delete(invite)

    new_invite = EmployeeInvite(
        employee_id=employee_id,
        created_by=admin.email,
        created_at=datetime.now(timezone.utc)
    )
    session.add(new_invite)
    session.commit()
    session.refresh(new_invite)

    # In a real application, you would send an email here with a link like:
    # http://frontend/register?token={new_invite.token}

    return InviteCreateResponse(
        token=new_invite.token,
        expires_at=new_invite.expires_at,
        message="Invite created successfully"
    )


@router.get('/invites/validate/{token}', response_model=InviteValidateResponse)
async def validate_invite(
        token: str,
        session: Session = Depends(get_session)
):
    """
    Validate an invitation token. (Public)
    """
    invite = session.exec(select(EmployeeInvite).where(EmployeeInvite.token == token)).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid token")

    if invite.expires_at.timestamp() < datetime.now(timezone.utc).timestamp():
        raise HTTPException(status_code=400, detail="Token has expired")

    if invite.is_used:
        raise HTTPException(status_code=409, detail="Invited token has already been used.")

    employee = session.get(Employee, invite.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Associated employee not found")

    return InviteValidateResponse(
        employee_id=employee.id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email
    )