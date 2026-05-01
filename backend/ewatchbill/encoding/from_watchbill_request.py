#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon

import datetime
from typing import Any, Tuple, Optional
import numpy as np

from ewatchbill.models import WatchbillParams


def parse_time(t_str: str | None) -> float:
    if not t_str: return 0.0
    parts = t_str.split(':')
    return float(parts[0]) + (float(parts[1]) / 60.0 if len(parts) > 1 else 0.0)


def _extract_assignment_data(assignment: Any) -> Tuple[Optional[int], Optional[str], Optional[str], Optional[int], Optional[datetime.date]]:
    """Extracts assignment data from either dictionaries or Pydantic models."""
    if isinstance(assignment, dict):
        ws_id = assignment.get("watchstation", {}).get("id")
        st = assignment.get("start_time")
        et = assignment.get("end_time")
        emp_id = assignment.get("watchstander", {}).get("id", 0)
        raw_date = assignment.get("date")
    else:
        ws_id = getattr(getattr(assignment, "watchstation", None), "id", None)
        st = getattr(assignment, "start_time", None)
        et = getattr(assignment, "end_time", None)
        emp_id = getattr(getattr(assignment, "watchstander", None), "id", 0)
        raw_date = getattr(assignment, "date", None)

    date_val = None
    if raw_date:
        date_val = datetime.datetime.strptime(raw_date, "%Y-%m-%d").date() if isinstance(raw_date, str) else raw_date

    return ws_id, st, et, emp_id, date_val


def from_watchbill_request(params: WatchbillParams) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, int, int, np.ndarray, list, list, list]:
    start_date = params.start
    end_date = params.end
    holiday_dates = params.holidays
    conflicts = params.conflicts

    num_days = (end_date - start_date).days + 1

    unique_shift_slots = []
    assigned_emp_ids = set()

    # Consolidate skeleton parsing
    if hasattr(params, 'skeleton') and params.skeleton:
        for assignment in params.skeleton:
            ws_id, st, et, emp_id, _ = _extract_assignment_data(assignment)

            if ws_id is not None:
                slot = (ws_id, st, et)
                if slot not in unique_shift_slots:
                    unique_shift_slots.append(slot)

            if emp_id and emp_id != 0:
                assigned_emp_ids.add(emp_id)
    else:
        for ws in params.watchstations:
            unique_shift_slots.append((ws.id, None, None))

    num_shift_slots = len(unique_shift_slots)

    frozen_emp_ids = set()
    frozen_assignments_matrix = []

    # Map frozen assignments in a single loop
    if hasattr(params, 'frozen_assignments') and params.frozen_assignments:
        for fa in params.frozen_assignments:
            ws_id, st, et, emp_id, date_val = _extract_assignment_data(fa)

            if emp_id and emp_id != 0:
                frozen_emp_ids.add(emp_id)

    active_watchstanders = []
    for ws in params.watchstanders:
        is_qualified = any(slot[0] in ws.watchstations for slot in unique_shift_slots)
        has_frozen = ws.id in frozen_emp_ids

        user_conflict_days = sum(
            1 for c in conflicts
            if c.watchstander == ws.id and 0 <= (c.date - start_date).days < num_days
        )
        is_available = user_conflict_days < num_days

        # Keep them in the matrix if they are qualified/available, frozen, or already assigned
        if (is_qualified and is_available) or has_frozen or (ws.id in assigned_emp_ids):
            active_watchstanders.append(ws)

    params.watchstanders = active_watchstanders
    num_people = len(params.watchstanders)

    shift_times = []
    for slot in unique_shift_slots:
        st = parse_time(slot[1]) if slot[1] else 0.0
        et = parse_time(slot[2]) if slot[2] else 24.0
        shift_times.append((st, et))

    # Build Headcount Matrix using the new helper
    headcount_matrix = np.zeros((num_days, num_shift_slots), dtype=int)
    if params.skeleton:
        for assignment in params.skeleton:
            ws_id, st, et, _, date_val = _extract_assignment_data(assignment)

            if not date_val:
                continue

            day_idx = (date_val - start_date).days
            if not (0 <= day_idx < num_days):
                continue

            slot = (ws_id, st, et)
            if slot in unique_shift_slots:
                s_idx = unique_shift_slots.index(slot)
                headcount_matrix[day_idx, s_idx] += 1

    qualification_matrix = np.zeros((num_people, num_shift_slots), dtype=int)
    for person_index, watchstander in enumerate(params.watchstanders):
        for slot_index, slot in enumerate(unique_shift_slots):
            ws_id = slot[0]
            if ws_id in watchstander.watchstations:
                qualification_matrix[person_index, slot_index] = 1

    holiday_mask = np.zeros(num_days, dtype=int)
    for holiday in holiday_dates:
        day_index = (holiday - start_date).days
        if 0 <= day_index < num_days:
            holiday_mask[day_index] = 1

    conflict_matrix = np.zeros((num_people, num_days), dtype=int)
    for conflict in conflicts:
        watchstander_index = next(
            (
                i
                for i, ws in enumerate(params.watchstanders)
                if ws.id == conflict.watchstander
            ),
            None,
        )
        day_index = (conflict.date - start_date).days
        if watchstander_index is not None and 0 <= day_index < num_days:
            conflict_matrix[watchstander_index, day_index] = 1

    offset_matrix = np.zeros(num_people, dtype=int)
    for i, watchstander in enumerate(params.watchstanders):
        offset_matrix[i] = watchstander.offset

    # Generate the frozen matrix
    if hasattr(params, 'frozen_assignments') and params.frozen_assignments:
        for assignment in params.frozen_assignments:
            ws_id, st, et, emp_id, date_val = _extract_assignment_data(assignment)

            if not emp_id or emp_id == 0 or not date_val:
                continue

            w_index = next(
                (i for i, ws in enumerate(params.watchstanders) if ws.id == emp_id),
                None
            )

            target_slot = (ws_id, st, et)
            s_index = unique_shift_slots.index(target_slot) if target_slot in unique_shift_slots else None

            d_index = (date_val - start_date).days

            if w_index is not None and s_index is not None and 0 <= d_index < num_days:
                frozen_assignments_matrix.append((w_index, d_index, s_index))

    return (
        qualification_matrix,
        conflict_matrix,
        holiday_mask,
        offset_matrix,
        params.min_days_off_between_duty,
        params.max_days_off_between_duty,
        headcount_matrix,
        shift_times,
        unique_shift_slots,
        frozen_assignments_matrix
    )