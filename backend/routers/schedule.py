#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
schedule.py

This module defines the API router for Schedule Generation and Management.
"""

import json
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import delete
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select, extract

from database.database import get_session, engine
from database.models import ScheduleDraft, User, Shift
from schemas.schedule_schemas import ScheduleRequest, EmployeeShiftRequest, ScheduleDraftSummaryRequest
from utils.auth.auth_users_utils import get_current_active_user
from utils.schedule.schedule_builder import build_watchbill_params
from ewatchbill.schedule_message_generator import schedule_message_generator
from ewatchbill.models import WatchbillResponse

router = APIRouter()

# In-memory cache to store temporary generation states/results
schedule_cache: dict[str, WatchbillResponse] = {}


async def sse_generator(generator, params):
    """
    Wraps the schedule generator to format output as Server-Sent Events (SSE).

    This function acts as a middleware between the algorithmic generator and the HTTP response.

    When the generator yields a result (final schedule), this function intercepts it
    and saves it to the database as a ScheduleDraft automatically.

    Args:
        generator: An asynchronous generator yielding schedule updates.
        params: The parameters used for schedule generation (start/end dates).

    Yields:
        str: Server-Sent Events formatted string (e.g., "data: {...}\n\n").
    """
    async for item in generator:
        try:
            payload = json.loads(item['data'])

            # Intercept if final result and save to draft database.
            if payload.get("type") == "result":
                draft_data = payload["payload"]

                with Session(engine) as session:
                    # Extract score history to find the final fitness score
                    history = draft_data.get("score_history", [])
                    final_score = history[-1] if history else 0

                    if not history:
                        print("WARNING: Score history missing from generator output.")

                    new_draft = ScheduleDraft(
                        score=final_score,
                        start_date=params.start,
                        end_date=params.end,
                        assignments=draft_data["assignments"]
                    )

                    session.add(new_draft)
                    session.commit()
                    session.refresh(new_draft)

                    # Inject the new Draft ID back into the payload so the frontend knows it was saved
                    draft_data["draft_id"] = str(new_draft.public_id)
                    draft_data["created_at"] = new_draft.created_at.isoformat()
                    draft_data["final_score"] = final_score

                    # Re-serialize the modified payload
                    payload["payload"] = draft_data
                    item['data'] = json.dumps(payload, default=str)

        except json.JSONDecodeError:
            # If data isn't JSON, just pass it through as a raw string message
            pass

        # Yield in SSE format
        yield f"data: {item['data']}\n\n"


@router.post("/schedule/drafts/generate")
async def generate_schedule(request_data: ScheduleRequest, request: Request):
    """
    Initiate the schedule generation process.

    This endpoint does not return a JSON body. Instead, it returns a StreamingResponse
    (Content-Type: text/event-stream) that pushes updates to the client as the
    algorithm progresses.

    Args:
        request_data (ScheduleRequest): The schedule generation parameters.
        request (Request): The incoming request object.

    Returns:
        StreamingResponse: A stream of SSE events.

    Raises:
        HTTPException (400): If no qualified members are found.
        HTTPException (500): If an error occurs during parameter building.
    """
    try:
        # Convert db data to ewatchbill algorithm parameters
        params = build_watchbill_params(request_data)

        if not params.watchstanders:
            raise HTTPException(status_code=400, detail="No qualified members found for these qualifications.")

    except Exception as e:
        # Re-raise HTTP exceptions, wrap others
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error building parameters: {str(e)}")

    request_id = str(uuid.uuid4())

    # Initialize the generator logic
    logic_stream = schedule_message_generator(
        public_id=request_id,
        cache=schedule_cache,
        request=request,
        watchbill_params=params
    )

    # Stream the output via SSE
    return StreamingResponse(
        sse_generator(logic_stream, params),
        media_type="text/event-stream"
    )

@router.get("/schedule/drafts", response_model=List[ScheduleDraftSummaryRequest])
async def get_schedule_drafts(session: Session = Depends(get_session)):
    """
    Retrieve a summary list of all saved schedule drafts.
    Ordered by creation date (newest first).

    Args:
        session (Session): Database session dependency.

    Returns:
        List[ScheduleDraftSummaryRequest]: A list of schedule draft summaries.
    """
    statement = select(ScheduleDraft).order_by(ScheduleDraft.created_at.desc())
    drafts = session.exec(statement).all()

    return drafts

@router.get("/schedule/drafts/{uuid_str}", response_model=ScheduleDraft)
async def get_schedule_draft(uuid_str: str,
                             user: User = Depends(get_current_active_user),
                             session: Session = Depends(get_session)):
    """
    Retrieve a specific draft by its UUID.
    Includes the full 'assignments' JSON blob.

    Args:
        uuid_str (str): The UUID of the draft to retrieve.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.

    Returns:
        ScheduleDraft: The requested schedule draft object.

    Raises:
        HTTPException (404): If the draft is not found.
    """
    statement = select(ScheduleDraft).where(ScheduleDraft.public_id == uuid.UUID(uuid_str))
    draft = session.exec(statement).one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    return draft

@router.post("/schedule/drafts/{uuid_str}/publish")
async def route_publish_draft(uuid_str: str,
                              user: User = Depends(get_current_active_user),
                              session: Session = Depends(get_session)):
    """
    Promotes a draft to the official schedule.
    WARNING: This overwrites any existing dates on the schedule.

    Args:
        uuid_str (str): The UUID of the draft to publish.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.

    Returns:
        dict: A message indicating success and the count of created shifts.

    Raises:
        HTTPException (404): If the draft is not found.
    """
    statement = select(ScheduleDraft).where(ScheduleDraft.public_id == uuid.UUID(uuid_str))
    draft = session.exec(statement).one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    # Gather all position IDs involved in this draft to scope the deletion
    included_position_ids = {a['watchstation']['id'] for a in draft.assignments}

    if not included_position_ids:
        return {"message": "Draft has no assignments, nothing published."}

    # Clean up existing schedule for these positions/dates
    delete_stmt = delete(Shift).where(
        Shift.shift_date >= draft.start_date,
        Shift.shift_date <= draft.end_date,
        Shift.position_id.in_(included_position_ids)
    )
    session.exec(delete_stmt)

    # Convert JSON draft assignments to the Shift SQL objects
    new_shifts = []

    for assignment in draft.assignments:
        date = datetime.fromisoformat(assignment['date'])

        # Attempt to extract start/end time if exists. Otherwise, default to 8-16
        start_time = datetime.fromisoformat(assignment['start_time'])\
            if "start_time" in assignment else date.replace(hour=8)
        end_time = datetime.fromisoformat(assignment['start_time'])\
            if "start_time" in assignment else date.replace(hour=16)

        new_shifts.append(Shift(
            employee_id=assignment['watchstander']['id'],
            position_id=assignment['watchstation']['id'],
            shift_date=date,
            start_time = start_time,
            end_time = end_time,
        ))

    session.add_all(new_shifts)

    # Delete draft once it's been published to the main schedule.
    statement = delete(ScheduleDraft).where(ScheduleDraft.public_id == uuid.UUID(uuid_str))
    session.exec(statement)

    session.commit()


@router.delete("/schedule/drafts/{uuid_str}/delete")
async def route_delete_draft(
        uuid_str: str,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)):
    """
    Delete a draft schedule
    """
    delete_statement = delete(ScheduleDraft).where(ScheduleDraft.public_id == uuid.UUID(uuid_str))
    session.exec(delete_statement)
    session.commit()


@router.get("/schedule/{year}/{month}", response_model=List[EmployeeShiftRequest])
async def retrieve_schedule(
        year: int,
        month: int,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)):
    """
    Retrieve the official schedule (Shifts) for a specific Month/Year.

    Includes eager loading of Employee and Position details.

    Args:
        year (int): The year of the schedule.
        month (int): The month of the schedule.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.

    Returns:
        List[EmployeeShiftRequest]: A list of employee shifts.
    """
    statement = select(Shift).where(
        extract('year', Shift.shift_date) == year,
        extract('month', Shift.shift_date) == month
    ).options(
        selectinload(Shift.employee),
        selectinload(Shift.position)
    )
    shifts = session.exec(statement).all()

    return shifts