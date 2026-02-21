#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
schedule_builder.py

This module acts as the Adapter layer between the Database/API and the Scheduling Algorithm.
"""

from datetime import timedelta
from sqlmodel import select, or_
from sqlalchemy.orm import selectinload

from database.database import get_session
from database.models import Position, Employee, TimeOffRequest, Shift
from ewatchbill.models import WatchbillParams, Watchstander, Watchstation, Conflict
from schemas.schedule_schemas import ScheduleRequest


def build_watchbill_params(request_data: ScheduleRequest) -> WatchbillParams:
    """
    Construct the configuration object for the scheduling algorithm.

    This function gathers all necessary context (who is qualified, who is on vacation,
    what shifts are already worked nearby) to ensure the algorithm generates a valid schedule.

    Args:
        request_data (ScheduleRequest): The parameters received from the API endpoint.

    Returns:
        WatchbillParams: The fully populated configuration object for the generator.
    """
    with get_session() as session:
        # Only select positions passed by request
        position_stmt = select(Position).where(Position.id.in_(request_data.position_ids))
        db_positions = session.exec(position_stmt).all()

        # Map database position to watchstation
        watchstations = [
            Watchstation(id=position.id, name=position.name, color=position.color)
            for position in db_positions
        ]

        # Eager load positions using selectinload
        employee_stmt = select(Employee).options(selectinload(Employee.positions))
        db_employees = session.exec(employee_stmt).all()

        watchstanders = []
        target_position_ids = set(request_data.position_ids)

        for employee in db_employees:
            # Filter this employee's positions to only the ones we are scheduling
            valid_positions = [
                p.id for p in employee.positions
                if p.id in target_position_ids
            ]

            # Only add the person if they are qualified for at least one thing being scheduled
            if valid_positions:
                watchstanders.append(
                    Watchstander(
                        id=employee.id,
                        name=f"{employee.last_name}, {employee.first_name}",
                        watchstations=valid_positions,
                        offset=0  # Future: Add option to offset specific employees based on previous months
                    )
                )

        # Handle conflicts (TimeOffRequests + manually defined conflicts)
        conflicts = []

        # Manual Conflicts from Frontend (This may be deleted in the future)
        for manual_conflict in request_data.manual_conflicts:
            conflicts.append(Conflict(watchstander=manual_conflict['employee_id'], date=manual_conflict['date']))

        # Get time off requests from database
        time_off_stmt = select(TimeOffRequest).where(
            TimeOffRequest.start_date <= request_data.end_date,
            TimeOffRequest.end_date >= request_data.start_date,
            TimeOffRequest.status != "Denied",
            TimeOffRequest.employee_id.in_([ws.id for ws in watchstanders])
        )
        time_off_requests = session.exec(time_off_stmt).all()

        for time_off in time_off_requests:
            # Calculate overlap
            effective_start = max(time_off.start_date, request_data.start_date)
            effective_end = min(time_off.end_date, request_data.end_date)

            # Flatten into daily conflicts
            current_day = effective_start
            while current_day <= effective_end:
                conflicts.append(
                    Conflict(
                        watchstander=time_off.employee_id,
                        date=current_day
                    )
                )
                current_day += timedelta(days=1)

        # Add lookahead and lookback to add currently scheduled shifts as conflicts when generating.
        # This prevents back to back scheduling between multiple drafts.
        # TODO: Add option to adjust this (probably from frontend in builder)
        buffer_days = 7

        lookback_limit = request_data.start_date - timedelta(days=buffer_days)
        lookahead_limit = request_data.end_date + timedelta(days=buffer_days)

        # Get shifts filtered by watchstanders within buffer zone.
        existing_shifts_stmt = select(Shift).where(
            Shift.employee_id.in_([ws.id for ws in watchstanders]),
            or_(
                (Shift.shift_date >= lookback_limit) & (Shift.shift_date < request_data.start_date),
                (Shift.shift_date > request_data.end_date) & (Shift.shift_date <= lookahead_limit)
            )
        )
        existing_shifts = session.exec(existing_shifts_stmt).all()

        for shift in existing_shifts:
            conflicts.append(
                Conflict(
                    watchstander=shift.employee_id,
                    date=shift.shift_date,
                )
            )

        return WatchbillParams(
            start=request_data.start_date,
            end=request_data.end_date,
            watchstanders=watchstanders,
            watchstations=watchstations,
            conflicts=conflicts,
            holidays=request_data.holidays,
            min_days_off_between_duty=request_data.min_days_off,
            max_iteration_steps=request_data.max_steps
        )