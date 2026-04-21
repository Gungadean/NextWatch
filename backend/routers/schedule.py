#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
schedule.py

This module defines the API router for Schedule Generation and Management.
"""

import json
import uuid
from datetime import datetime, time, timedelta
from typing import List

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select, extract

from database.database import get_session, engine
from database.models import ScheduleDraft, User, Shift, Position
from ewatchbill.logic.evaluate_schedule import evaluate_draft_schedule, ValidationResponse
from ewatchbill.logic.exceptions.IllegalScheduleException import IllegalScheduleException
from schemas.schedule_schemas import ScheduleRequest, EmployeeShiftRequest, ScheduleDraftSummaryRequest, \
    DraftWatchstation, DraftWatchstander, DraftAssignment
from utils.auth.auth_users_utils import get_current_active_user
from utils.schedule.schedule_builder import build_watchbill_params
from ewatchbill.schedule_message_generator import schedule_message_generator
from ewatchbill.models import WatchbillResponse, Assignment

router = APIRouter()

# In-memory cache to store temporary generation states/results
schedule_cache: dict[str, WatchbillResponse] = {}


class ValidationRequest(BaseModel):
    """
    A draft from the frontend to be validated against the application constraint model
    """
    params: ScheduleRequest
    assignments: List[Assignment]
    target_date: str = None
    target_person_names: List[str] = []


class LiveRegenRequest(BaseModel):
    """
    Dates and constraints to be regenerated for a published schedule.
    """
    dates: List[str]
    min_days_off: int = 1
    max_days_off: int = 7
    max_steps: int = 10000
    ignore_pending_timeoff: bool = False


async def sse_generator(
        generator,
        params=None,
        request_data=None,
        regen_uuid: str = None,
        is_live: bool = False,
        target_dates: list = None
):
    """
    Wraps the schedule generator to format output as Server-Sent Events (SSE).

    This function acts as a middleware between the algorithmic generator and the HTTP response.

    When the generator yields a result (final schedule), this function intercepts it
    and saves it to either the live schedule database or the ScheduleDraft database automatically.

    Args:
        generator: An asynchronous generator yielding schedule updates.
        params: The parameters used for schedule generation (start/end dates).
        request_data: ScheduleRequest object to be serialized into the Draft sql object.
        regen_uuid: The uuid of the existing draft to regenerate.
        is_live: Boolean flag indicating if the result should be saved directly to the live schedule.
        target_dates: List of specific dates to overwrite if saving to the live schedule.

    Yields:
        str: Server-Sent Events formatted string (e.g., "data: {...}\n\n").
    """
    async for item in generator:
        try:
            payload = json.loads(item['data'])

            # Intercept if final result and save to the live or draft database.
            if payload.get("type") == "result":
                draft_data = payload["payload"]

                with Session(engine) as session:
                    if is_live and target_dates:
                        # Clean up existing shifts for the regenerated dates
                        delete_stmt = delete(Shift).where(Shift.shift_date.in_(target_dates))
                        session.exec(delete_stmt)

                        new_shifts = []
                        for assignment in draft_data["assignments"]:
                            date_val = datetime.fromisoformat(assignment['date']).date()

                            # Only save shifts that fall on our requested target dates
                            if date_val in target_dates:
                                # Attempt to extract start/end time if exists. Otherwise, default to 8-16
                                if "start_time" in assignment and assignment['start_time']:
                                    parsed_start = time.fromisoformat(assignment['start_time'])
                                    start_time = datetime.combine(date_val, parsed_start)
                                else:
                                    start_time = datetime.combine(date_val, time(8, 0))

                                if "end_time" in assignment and assignment['end_time']:
                                    parsed_end = time.fromisoformat(assignment['end_time'])
                                    end_time = datetime.combine(date_val, parsed_end)
                                else:
                                    end_time = datetime.combine(date_val, time(16, 0))

                                new_shifts.append(Shift(
                                    employee_id=assignment['watchstander']['id'],
                                    position_id=assignment['watchstation']['id'],
                                    shift_date=date_val,
                                    start_time=start_time,
                                    end_time=end_time,
                                ))

                        session.add_all(new_shifts)
                        session.commit()

                    else:
                        # Extract score history to find the final fitness score
                        history = draft_data.get("score_history", [])
                        final_score = history[-1] if history else 0

                        if not history:
                            print("WARNING: Score history missing from generator output.")

                        if regen_uuid:
                            stmt = select(ScheduleDraft).where(ScheduleDraft.public_id == uuid.UUID(regen_uuid))
                            draft = session.exec(stmt).one_or_none()

                            if not draft:
                                print("WARNING: Draft not found for regeneration.")
                                break

                        else:
                            draft = ScheduleDraft(
                                score=final_score,
                                start_date=params.start,
                                end_date=params.end,
                                parameters=request_data.model_dump(mode="json", exclude={"skeleton", "frozen_assignments"}),
                                assignments=draft_data["assignments"]
                            )

                        session.add(draft)
                        session.commit()
                        session.refresh(draft)

                        # Inject the new Draft ID back into the payload so the frontend knows it was saved
                        draft_data["draft_id"] = str(draft.public_id)
                        draft_data["created_at"] = draft.created_at.isoformat()
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
async def generate_schedule(
        request_data: ScheduleRequest,
        request: Request,
        user: User = Depends(get_current_active_user)
):
    """
    Initiate the schedule generation process.

    This endpoint does not return a JSON body. Instead, it returns a StreamingResponse
    (Content-Type: text/event-stream) that pushes updates to the client as the
    algorithm progresses.

    Args:
        request_data (ScheduleRequest): The schedule generation parameters.
        request (Request): The incoming request object.
        user (User): The current active user object.

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
        sse_generator(logic_stream, params, request_data),
        media_type="text/event-stream"
    )

@router.get("/schedule/drafts", response_model=List[ScheduleDraftSummaryRequest])
async def get_schedule_drafts(
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
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
async def get_schedule_draft(
        uuid_str: str,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
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
async def route_publish_draft(
        uuid_str: str,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Promotes a draft to the official schedule.
    WARNING: This overwrites any existing dates on the schedule.

    Args:
        uuid_str (str): The UUID of the draft to publish.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.

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
        if "start_time" in assignment and assignment['start_time']:
            parsed_start = time.fromisoformat(assignment['start_time'])
            start_time = datetime.combine(date.date(), parsed_start)
        else:
            start_time = date.replace(hour=8)

        if "end_time" in assignment and assignment['end_time']:
            parsed_end = time.fromisoformat(assignment['end_time'])
            end_time = datetime.combine(date.date(), parsed_end)
        else:
            end_time = date.replace(hour=16)

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
    return None


@router.post("/schedule/drafts/{uuid_str}/update")
async def route_update_draft(
        uuid_str: str,
        data: List[dict],
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Updates a draft based on changes made in the frontend builder.

    Args:
        uuid_str (str): The UUID of the draft to publish.
        data (ScheduleDraft): The updated draft data.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.

    Raises:
        HTTPException (404): If the draft is not found.
    """
    statement = select(ScheduleDraft).where(ScheduleDraft.public_id == uuid.UUID(uuid_str))

    draft = session.exec(statement).one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft.assignments = jsonable_encoder(data)

    session.add(draft)
    session.commit()
    session.refresh(draft)

    return draft


@router.post("/schedule/drafts/{uuid_str}/regen")
async def regenerate_schedule(
        uuid_str: str,
        request_data: ScheduleRequest,
        request: Request,
        user: User = Depends(get_current_active_user)
):
    """
    This router takes an existing schedule and regenerates only for the user selected dates
    in the frontend.

    This endpoint does not return a JSON body. Instead, it returns a StreamingResponse
    (Content-Type: text/event-stream) that pushes updates to the client as the
    algorithm progresses.

    Args:
        uuid_str (str): The UUID of the draft to regenerated.
        request_data (ScheduleRequest): The schedule generation parameters.
        request (Request): The incoming request object.
        user (User): The currently authenticated user.

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
        if isinstance(e, IllegalScheduleException):
            raise HTTPException(status_code=500, detail=f"Error building parameters: {str(e)}")
        raise e

    # Initialize the generator logic
    logic_stream = schedule_message_generator(
        public_id=uuid_str,
        cache=schedule_cache,
        request=request,
        watchbill_params=params
    )

    # Stream the output via SSE
    return StreamingResponse(
        sse_generator(logic_stream, params, request_data, regen_uuid=uuid_str),
        media_type="text/event-stream"
    )


@router.delete("/schedule/drafts/{uuid_str}/delete")
async def route_delete_draft(
        uuid_str: str,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Delete a draft schedule

    Args:
        uuid_str (str): The UUID of the draft to regenerated.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.
    """
    delete_statement = delete(ScheduleDraft).where(ScheduleDraft.public_id == uuid.UUID(uuid_str))
    session.exec(delete_statement)
    session.commit()


@router.put("/schedule/live/{date_str}")
async def update_live_schedule_day(
        date_str: str,
        assignments: list[dict],
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Overwrites specific date on the official schedule.

    Args:
        date_str (str): Date string for the day to be replaced.
        assignments (list[dict]): The list of new assignments for that day.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.
    """
    target_date = datetime.fromisoformat(date_str).date()

    # Delete all existing shifts for this specific day
    delete_stmt = delete(Shift).where(Shift.shift_date == target_date)
    session.exec(delete_stmt)

    # Insert the updated shifts
    new_shifts = []
    for assignment in assignments:
        date = datetime.fromisoformat(assignment['date'])

        # Parse start_time and end_time, default to 0800-1600 if missing
        if "start_time" in assignment and assignment['start_time']:
            parsed_start = time.fromisoformat(assignment['start_time'])
            start_time = datetime.combine(date.date(), parsed_start)
        else:
            start_time = datetime.combine(date.date(), time(8, 0))

        if "end_time" in assignment and assignment['end_time']:
            parsed_end = time.fromisoformat(assignment['end_time'])
            end_time = datetime.combine(date.date(), parsed_end)
        else:
            end_time = datetime.combine(date.date(), time(16, 0))

        new_shifts.append(Shift(
            employee_id=assignment['watchstander']['id'],
            position_id=assignment['watchstation']['id'],
            shift_date=date.date(),
            start_time=start_time,
            end_time=end_time,
        ))

    session.add_all(new_shifts)
    session.commit()
    return {"message": "Success"}


@router.post("/schedule/live/regen")
async def regenerate_live_days(
        request_data: LiveRegenRequest,
        request: Request,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Regenerates specific dates on the live schedule.
    Freezes all other dates in the bounding range to maintain constraints.

    Args:
        request_data (LiveRegenRequest): Dates to be regenerated.
        request (Request): The incoming request object.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.

    Returns:
        StreamingResponse: A stream of SSE events.

    Raises:
        HTTPException (400): If no qualified members are found.
        HTTPException (500): If an error occurs during parameter building.
    """
    if not request_data.dates:
        return {"message": "No dates provided"}

    target_dates = [datetime.fromisoformat(d).date() for d in request_data.dates]
    start_date = min(target_dates) - timedelta(days=7)
    end_date = max(target_dates) + timedelta(days=7)

    # Get all active positions
    positions = session.exec(select(Position).where(Position.is_active == True)).all()
    position_ids = [p.id for p in positions]

    # Get all existing shifts in the bounding range
    existing_shifts = session.exec(
        select(Shift).where(
            Shift.shift_date >= start_date,
            Shift.shift_date <= end_date
        ).options(selectinload(Shift.employee), selectinload(Shift.position))
    ).all()

    frozen_assignments = []
    skeleton_assignments = []

    # Sort existing shifts into frozen (surrounding days) and skeleton (target days)
    for s in existing_shifts:
        start_str = s.start_time.time().isoformat() if s.start_time else None
        end_str = s.end_time.time().isoformat() if s.end_time else None

        if s.shift_date not in target_dates:
            frozen_assignments.append(DraftAssignment(
                date=s.shift_date,
                watchstander=DraftWatchstander(
                    id=s.employee.id,
                    name=f"{s.employee.last_name}, {s.employee.first_name}",
                    watchstations=[],
                    offset=0
                ),
                watchstation=DraftWatchstation(
                    id=s.position.id,
                    name=s.position.name,
                    color=s.position.color
                ),
                start_time=start_str,
                end_time=end_str
            ))
            skeleton_assignments.append(DraftAssignment(
                date=s.shift_date,
                watchstander=DraftWatchstander(
                    id=0,
                    name="Unassigned",
                    watchstations=[],
                    offset=0
                ),
                watchstation=DraftWatchstation(
                    id=s.position.id,
                    name=s.position.name,
                    color=s.position.color
                ),
                start_time=start_str,
                end_time=end_str
            ))
        else:
            skeleton_assignments.append(DraftAssignment(
                date=s.shift_date,
                watchstander=DraftWatchstander(
                    id=0,
                    name="Unassigned",
                    watchstations=[],
                    offset=0
                ),
                watchstation=DraftWatchstation(
                    id=s.position.id,
                    name=s.position.name,
                    color=s.position.color
                ),
                start_time=start_str,
                end_time=end_str
            ))

    sched_req = ScheduleRequest(
        start_date=start_date,
        end_date=end_date,
        position_ids=position_ids,
        ignore_pending_timeoff=request_data.ignore_pending_timeoff,
        min_days_off=request_data.min_days_off,
        max_days_off=request_data.max_days_off,
        max_steps=request_data.max_steps,
        frozen_assignments=frozen_assignments,
        skeleton=skeleton_assignments
    )

    try:
        params = build_watchbill_params(sched_req)
        if not params.watchstanders:
            raise HTTPException(status_code=400, detail="No qualified members found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error building parameters: {str(e)}")

    # Initialize the generator logic
    logic_stream = schedule_message_generator(
        public_id=str(uuid.uuid4()),
        cache=schedule_cache,
        request=request,
        watchbill_params=params
    )

    # Stream the output using the unified SSE interceptor (is_live=True)
    return StreamingResponse(
        sse_generator(logic_stream, is_live=True, target_dates=target_dates),
        media_type="text/event-stream"
    )


@router.post("/schedule/validate", response_model=ValidationResponse)
async def validate_schedule(
        request: ValidationRequest,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
    """
    Retrieve the official schedule (Shifts) for a specific Month/Year.

    Includes eager loading of Employee and Position details.

    Args:
        request (ValidationRequest): The schedule generation parameters.
        user (User): The currently authenticated user.
        session (Session): Database session dependency.

    Returns:
        ValidationResponse: A list containing

    Raises:
        HTTPException (500): If an error occurs while validating.
    """
    try:
        # Rebuild the mathematical environment from the frontend's parameters
        watchbill_params = build_watchbill_params(request.params)

        # Fetch historical/future shifts
        buffer_start = watchbill_params.start - timedelta(days=7)
        buffer_end = watchbill_params.end + timedelta(days=7)

        # Query published shifts outside the draft window but inside the buffer
        stmt = select(Shift).where(
            ((Shift.shift_date >= buffer_start) & (Shift.shift_date < watchbill_params.start)) |
            ((Shift.shift_date > watchbill_params.end) & (Shift.shift_date <= buffer_end))
        ).options(selectinload(Shift.employee), selectinload(Shift.position))

        buffer_shifts = session.exec(stmt).all()

        # Format them for the math engine
        published_buffers = [
            {
                "name": f"{s.employee.last_name}, {s.employee.first_name}",
                "date": s.shift_date.strftime("%Y-%m-%d"),
            }
            for s in buffer_shifts
        ]

        evaluation_result = evaluate_draft_schedule(
            watchbill_params=watchbill_params,
            draft_assignments=request.assignments,
            target_date=request.target_date,
            target_person_names=request.target_person_names,
            published_buffers=published_buffers
        )

        return evaluation_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/schedule/{year}/{month}", response_model=List[EmployeeShiftRequest])
async def retrieve_schedule(
        year: int,
        month: int,
        user: User = Depends(get_current_active_user),
        session: Session = Depends(get_session)
):
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