#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
schedule_builder.py

This module acts as the Adapter layer between the Database/API and the Scheduling Algorithm.
"""

from datetime import timedelta
from sqlmodel import select, or_, Session
from sqlalchemy.orm import selectinload

from database.database import engine
from database.models import Position, Employee, TimeOffRequest, Shift
from ewatchbill.models import WatchbillParams, Watchstation, Conflict
from schemas.schedule_schemas import ScheduleRequest, DraftWatchstander


def build_watchbill_params(request_data: ScheduleRequest) -> tuple[WatchbillParams, list[dict]]:
    """
    Construct the configuration object for the scheduling algorithm.

    This function gathers all necessary context (who is qualified, who is on vacation,
    what shifts are already worked nearby) to ensure the algorithm generates a valid schedule.

    Args:
        request_data (ScheduleRequest): The parameters received from the API endpoint.

    Returns:
        tuple[WatchbillParams, list[dict]]: The fully populated configuration object for the generator and fixed assignments.
    """
    with Session(engine) as session:
        # Only select positions passed by request
        position_stmt = select(Position).where(Position.id.in_(request_data.position_ids))
        db_positions = session.exec(position_stmt).all()

        # Map database position to watchstation
        watchstations = [
            Watchstation(id=position.id, name=position.name, color=position.color)
            for position in db_positions
        ]

        dynamic_position_ids = set()
        fixed_position_ids = set()

        for position in db_positions:
            for req in position.requirements:
                if req.is_fixed:
                    fixed_position_ids.add(position.id)
                else:
                    dynamic_position_ids.add(position.id)

        # Eager load positions using selectinload
        employee_stmt = select(Employee).where(Employee.is_active == True).options(selectinload(Employee.positions))
        db_employees = session.exec(employee_stmt).all()

        watchstanders = []
        target_position_ids = set(request_data.position_ids)

        for employee in db_employees:
            employee_pos_ids = {p.id for p in employee.positions}

            # If this employee holds ANY position that is fixed, they are strictly
            # a fixed-schedule employee. We completely skip adding them to the math engine!
            if employee_pos_ids.intersection(fixed_position_ids):
                continue

            # Filter this employee's positions to only the ones we are scheduling
            # (and figure out what dynamic roles they can work)
            valid_dynamic_positions = list(
                employee_pos_ids.intersection(dynamic_position_ids).intersection(target_position_ids))

            # Only add the person if they are qualified for at least one thing being scheduled
            if valid_dynamic_positions:
                watchstanders.append(
                    DraftWatchstander(
                        id=employee.id,
                        name=f"{employee.last_name}, {employee.first_name}",
                        watchstations=valid_dynamic_positions,
                        offset=0  # Future: Add option to offset specific employees based on previous months
                    )
                )

        # Handle conflicts (TimeOffRequests + manually defined conflicts)
        conflicts = []
        fixed_assignments = []

        # Generate Fixed/Static Assignments directly for the draft output
        for position in db_positions:
            for requirement in position.requirements:
                if requirement.is_fixed:
                    eligible_employees = [e for e in db_employees if position.id in [p.id for p in e.positions]]

                    for emp in eligible_employees:
                        curr_day = request_data.start_date
                        while curr_day <= request_data.end_date:
                            if curr_day.weekday() in requirement.applies_on_days:
                                # We no longer add a Conflict here, because the algorithm doesn't even know this person exists!
                                fixed_assignments.append({
                                    "date": curr_day.isoformat(),
                                    "start_time": requirement.shift_template.start_time.isoformat() if requirement.shift_template else None,
                                    "end_time": requirement.shift_template.end_time.isoformat() if requirement.shift_template else None,
                                    "is_fixed": True,
                                    "watchstander": {
                                        "id": emp.id,
                                        "name": f"{emp.last_name}, {emp.first_name}",
                                        "offset": 0,
                                        "watchstations": [p.id for p in emp.positions]
                                    },
                                    "watchstation": {
                                        "id": position.id,
                                        "name": f"{position.name} ({requirement.shift_template.name})" if requirement.shift_template else position.name,
                                        "color": position.color
                                    }
                                })
                            curr_day += timedelta(days=1)

        watchstander_ids = [ws.id for ws in watchstanders]

        # Manual Conflicts from Frontend (This may be deleted in the future)
        # (Only apply to dynamic workers)
        for manual_conflict in request_data.manual_conflicts:
            if manual_conflict['employee_id'] in watchstander_ids:
                conflicts.append(Conflict(watchstander=manual_conflict['employee_id'], date=manual_conflict['date']))

        # Only query time-off and shift lookbacks if we actually have dynamic workers
        if watchstander_ids:
            # Get time off requests from database
            if request_data.ignore_pending_timeoff:
                time_off_stmt = select(TimeOffRequest).where(
                    TimeOffRequest.start_date <= request_data.end_date,
                    TimeOffRequest.end_date >= request_data.start_date,
                    TimeOffRequest.status != "Denied",
                    TimeOffRequest.status != "Pending",
                    TimeOffRequest.employee_id.in_(watchstander_ids)
                )
            else:
                time_off_stmt = select(TimeOffRequest).where(
                    TimeOffRequest.start_date <= request_data.end_date,
                    TimeOffRequest.end_date >= request_data.start_date,
                    TimeOffRequest.status != "Denied",
                    TimeOffRequest.employee_id.in_(watchstander_ids)
                )
            time_off_requests = session.exec(time_off_stmt).all()

            for time_off in time_off_requests:
                # Calculate overlap
                effective_start = max(time_off.start_date, request_data.start_date)
                effective_end = min(time_off.end_date, request_data.end_date)

                # Flatten into daily conflicts
                current_day = effective_start
                while current_day <= effective_end:
                    conflicts.append(Conflict(watchstander=time_off.employee_id, date=current_day))
                    current_day += timedelta(days=1)

            # Add lookahead and lookback to add currently scheduled shifts as conflicts when generating.
            # This prevents back to back scheduling between multiple drafts.
            # TODO: Add option to adjust this (probably from frontend in builder)
            buffer_days = 7

            lookback_limit = request_data.start_date - timedelta(days=buffer_days)
            lookahead_limit = request_data.end_date + timedelta(days=buffer_days)

            # Get shifts filtered by watchstanders within buffer zone.
            existing_shifts_stmt = select(Shift).where(
                Shift.employee_id.in_(watchstander_ids),
                or_(
                    (Shift.shift_date >= lookback_limit) & (Shift.shift_date < request_data.start_date),
                    (Shift.shift_date > request_data.end_date) & (Shift.shift_date <= lookahead_limit)
                )
            )
            existing_shifts = session.exec(existing_shifts_stmt).all()

            for shift in existing_shifts:
                conflicts.append(Conflict(watchstander=shift.employee_id, date=shift.shift_date))

        # Filter out fixed assignments from the skeleton so the algorithm doesn't try to fill them
        dynamic_skeleton = [a.model_dump() for a in request_data.skeleton if not a.is_fixed]

        params = WatchbillParams(
            start=request_data.start_date,
            end=request_data.end_date,
            watchstanders=watchstanders,
            watchstations=watchstations,
            conflicts=conflicts,
            holidays=request_data.holidays,
            min_days_off_between_duty=request_data.min_days_off,
            max_days_off_between_duty=request_data.max_days_off,
            max_iteration_steps=request_data.max_steps,
            frozen_assignments=[a.model_dump() for a in request_data.frozen_assignments],
            skeleton=dynamic_skeleton
        )

        return params, fixed_assignments