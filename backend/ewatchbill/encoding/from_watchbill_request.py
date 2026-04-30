#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
import copy
import math

import numpy as np

from ewatchbill.models import WatchbillParams


def parse_time(t_str: str | None) -> float:
    if not t_str: return 0.0
    parts = t_str.split(':')
    return float(parts[0]) + (float(parts[1]) / 60.0 if len(parts) > 1 else 0.0)


def float_to_time_str(time_float: float) -> str:
    """Converts a float like 18.5 back to a string '18:30:00'"""
    time_float = time_float % 24.0  # Keep it within 24 hours
    hours = int(time_float)
    minutes = int(round((time_float - hours) * 60))
    return f"{hours:02d}:{minutes:02d}:00"


def from_watchbill_request(params: WatchbillParams):
    start_date = params.start
    end_date = params.end
    holiday_dates = params.holidays
    conflicts = params.conflicts

    num_days = (end_date - start_date).days + 1

    if params.skeleton:
        shattered_skeleton = []
        for a in params.skeleton:

            # Extract values based on object type
            is_dict = isinstance(a, dict)
            split_inc = a.get("split_increment") if is_dict else getattr(a, "split_increment", None)

            if split_inc and split_inc > 0:
                st_val = a.get("start_time") if is_dict else getattr(a, "start_time", None)
                et_val = a.get("end_time") if is_dict else getattr(a, "end_time", None)

                start_float = parse_time(st_val) if st_val else 0.0
                end_float = parse_time(et_val) if et_val else 24.0

                dur = end_float - start_float if end_float > start_float else (end_float + 24.0) - start_float
                if dur == 0:
                    dur = 24.0

                num_chunks = int(math.floor(dur / split_inc))

                if num_chunks > 1:
                    current_start = start_float
                    for i in range(num_chunks):
                        chunk_end = current_start + split_inc

                        # Clone and update based on data structure
                        if is_dict:
                            sub_assignment = copy.deepcopy(a)
                            sub_assignment["split_increment"] = None
                            sub_assignment["start_time"] = float_to_time_str(current_start)
                            sub_assignment["end_time"] = float_to_time_str(chunk_end)
                        else:
                            sub_assignment = a.model_copy(update={
                                "split_increment": None,
                                "start_time": float_to_time_str(current_start),
                                "end_time": float_to_time_str(chunk_end)
                            })

                        shattered_skeleton.append(sub_assignment)
                        current_start = chunk_end
                else:
                    shattered_skeleton.append(a)
            else:
                shattered_skeleton.append(a)

        params.skeleton = shattered_skeleton

    unique_shift_slots = []
    if hasattr(params, 'skeleton') and params.skeleton:
        for assignment in params.skeleton:
            slot = (assignment.watchstation.id, assignment.start_time, assignment.end_time)
            if slot not in unique_shift_slots:
                unique_shift_slots.append(slot)
    else:
        for ws in params.watchstations:
            unique_shift_slots.append((ws.id, None, None))

    num_shift_slots = len(unique_shift_slots)

    frozen_emp_ids = set()
    if hasattr(params, 'frozen_assignments') and params.frozen_assignments:
        frozen_emp_ids = {fa.watchstander.id for fa in params.frozen_assignments if fa.watchstander.id != 0}

    # Prevent actively assigned users from being silently dropped due to conflicts
    assigned_emp_ids = set()
    if params.skeleton:
        for a in params.skeleton:
            # Safely handle both Pydantic models (Validation) and Dicts (Generation)
            if hasattr(a, 'watchstander'):
                emp_id = getattr(a.watchstander, 'id', 0)
            elif isinstance(a, dict) and 'watchstander' in a:
                emp_id = a['watchstander'].get('id', 0)
            else:
                emp_id = 0

            if emp_id != 0:
                assigned_emp_ids.add(emp_id)

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

    # Build Headcount Matrix from the skeleton
    headcount_matrix = np.zeros((num_days, num_shift_slots), dtype=int)
    if params.skeleton:
        # Only require shifts that explicitly exist in the template
        for assignment in params.skeleton:
            day_idx = (assignment.date - start_date).days
            if not (0 <= day_idx < num_days): continue

            slot = (assignment.watchstation.id, assignment.start_time, assignment.end_time)
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

    frozen_assignments_matrix = []

    if hasattr(params, 'frozen_assignments') and params.frozen_assignments:

        for assignment in params.frozen_assignments:
            # Find the watchstander index
            emp_id = assignment.watchstander.id

            if emp_id == 0:
                continue

            w_index = next(
                (i for i, ws in enumerate(params.watchstanders) if ws.id == emp_id),
                None
            )

            # Find the watchstation index
            target_slot = (assignment.watchstation.id, assignment.start_time, assignment.end_time)
            s_index = None
            if target_slot in unique_shift_slots:
                s_index = unique_shift_slots.index(target_slot)

            # Find the day index
            date = assignment.date
            if date:
                d_index = (assignment.date - start_date).days
            else:
                d_index = None

            # Frozen assignment found, append to the matrix
            if w_index is not None and s_index is not None and d_index is not None:
                if 0 <= d_index < num_days:
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