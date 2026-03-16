#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon

import numpy as np

from ewatchbill.models import WatchbillParams


def parse_time(t_str: str | None) -> float:
    if not t_str: return 0.0
    parts = t_str.split(':')
    return float(parts[0]) + (float(parts[1]) / 60.0 if len(parts) > 1 else 0.0)


def from_watchbill_request(params: WatchbillParams):
    start_date = params.start
    end_date = params.end
    holiday_dates = params.holidays
    conflicts = params.conflicts

    num_days = (end_date - start_date).days + 1
    num_people = len(params.watchstanders)

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

    shift_times = []
    for slot in unique_shift_slots:
        st = parse_time(slot[1]) if slot[1] else 0.0
        et = parse_time(slot[2]) if slot[2] else 24.0
        shift_times.append((st, et))

    # Build Headcount Matrix from the skeleton
    headcount_matrix = np.zeros((num_days, num_shift_slots), dtype=int)
    if hasattr(params, 'skeleton') and params.skeleton:
        for assignment in params.skeleton:
            day_idx = (assignment.date - start_date).days
            if not (0 <= day_idx < num_days): continue

            slot = (assignment.watchstation.id, assignment.start_time, assignment.end_time)
            if slot in unique_shift_slots:
                s_idx = unique_shift_slots.index(slot)
                headcount_matrix[day_idx, s_idx] += 1
    else:
        headcount_matrix.fill(1)

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
        headcount_matrix,
        shift_times,
        unique_shift_slots,
        frozen_assignments_matrix
    )