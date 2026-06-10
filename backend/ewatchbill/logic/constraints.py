#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon

from typing import Tuple, List, Any
import numpy as np


def is_legal(
        schedule: np.ndarray,
        qualification_matrix: np.ndarray,
        conflict_matrix: np.ndarray,
        shift_times: List[Tuple[float, float]],
        translator: Any = None,
        frozen_assignments_matrix: list[tuple[int, int, int]] = None,
) -> Tuple[bool, List[str]]:
    """
    Acts as the strict Hard Constraint auditor.
    """
    if not frozen_assignments_matrix:
        frozen_assignments_matrix = []

    errors = []
    n_people, n_days, n_slots = schedule.shape

    # Frozen Assignments Check
    for w, d, s in frozen_assignments_matrix:
        if schedule[w, d, s] == 0:
            errors.append(
                f"{translator.get_person(w)} was removed from {translator.get_station(s)} on {translator.get_date(d)} which is frozen.")

    # Qualification Check
    for p in range(n_people):
        for s in range(n_slots):
            if qualification_matrix[p, s] == 0 and np.sum(schedule[p, :, s]) > 0:
                bad_days = np.where(schedule[p, :, s] > 0)[0]
                for d in bad_days:
                    errors.append(
                        f"Qualification Error: {translator.get_person(p)} is scheduled for {translator.get_station(s)} on {translator.get_date(d)} but is not qualified.")

    # Conflict Check
    for p in range(n_people):
        for d in range(n_days):
            if conflict_matrix[p, d] == 1 and np.sum(schedule[p, d, :]) > 0:
                errors.append(
                    f"Conflict Error: {translator.get_person(p)} is scheduled on {translator.get_date(d)} during an approved conflict.")

    # Linear Time Checks (Overlaps & Hard Limits)
    for p in range(n_people):
        duty_days = np.where(np.sum(schedule[p], axis=1) > 0)[0]
        absolute_shifts = []

        for d in duty_days:
            worked_slots = np.where(schedule[p, d] > 0)[0]
            for s in worked_slots:
                st, et = shift_times[s]

                abs_start = d * 24.0 + st
                abs_end = d * 24.0 + et
                if et <= st and not (st == 0.0 and et == 24.0):
                    abs_end += 24.0

                absolute_shifts.append((abs_start, abs_end, d, s))

        absolute_shifts.sort(key=lambda x: x[0])

        ws_obj = translator.watchstanders[p] if translator else None
        max_len = ws_obj.get('max_shift_length') if isinstance(ws_obj, dict) else getattr(ws_obj, 'max_shift_length',
                                                                                          None)

        if absolute_shifts:
            current_start, current_end, prev_d, prev_s = absolute_shifts[0]

            for st, et, d, s in absolute_shifts[1:]:
                gap = round(st - current_end, 2)

                if gap < 0:
                    errors.append(
                        f"Overlapping Shift: {translator.get_person(p)} is double-booked on {translator.get_date(d)}.")
                    current_end = max(current_end, et)
                elif gap == 0:
                    # Seamlessly connected (e.g., shattered 24-hour shift)
                    current_end = max(current_end, et)
                else:
                    dur = round(current_end - current_start, 2)
                    if max_len and dur > max_len:
                        errors.append(
                            f"Max Shift Exceeded: {translator.get_person(p)} worked {dur}hrs continuously (Limit: {max_len}hr).")

                    current_start, current_end, prev_d, prev_s = st, et, d, s

            # Check final block
            dur = round(current_end - current_start, 2)
            if max_len and dur > max_len:
                errors.append(
                    f"Max Shift Exceeded: {translator.get_person(p)} worked {dur}hrs continuously (Limit: {max_len}hr).")

    return len(errors) == 0, list(set(errors))