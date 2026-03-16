#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston



from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlmodel import Session, select

from database.database import get_session
from database.models import User
from database.models.position import ShiftTemplate
from schemas.template_schemas import ShiftTemplateRead, ShiftTemplateCreate
from utils.auth.auth_users_utils import get_current_active_user

router = APIRouter()


@router.get("/templates", response_model=list[ShiftTemplateRead])
def get_shift_templates(
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Fetch all reusable time blocks.
    """
    templates = session.exec(select(ShiftTemplate)).all()
    return templates


@router.post("/templates/add", response_model=ShiftTemplateRead)
def create_shift_template(
        template_in: ShiftTemplateCreate,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Create a new reusable time block.
    """
    db_template = ShiftTemplate(**template_in.model_dump())
    session.add(db_template)
    session.commit()
    session.refresh(db_template)
    return db_template


@router.delete("/templates/{template_id}/delete")
def delete_shift_template(
        template_id: int,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Delete a reusable time block.
    """
    statement = delete(ShiftTemplate).where(ShiftTemplate.id == template_id)
    session.exec(statement)
    session.commit()