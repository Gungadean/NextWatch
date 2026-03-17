#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon

from datetime import timedelta

import numpy as np

from ewatchbill.models import Assignment, WatchbillParams, WatchbillResponse


def to_watchbill_response(
    watchbill: np.ndarray,
    params: WatchbillParams,
    score_history: list[float],
    complete: bool,
    unique_shift_slots: list,
) -> WatchbillResponse:
    """
    Convert the watchbill to a WatchbillResponse object.
    """
    start_date = params.start
    end_date = params.end
    num_days = (end_date - start_date).days + 1

    num_shift_slots = len(unique_shift_slots)

    assignments = []
    for day_index in range(num_days):
        day = start_date + timedelta(days=day_index)
        for s_idx in range(num_shift_slots):
            slot = unique_shift_slots[s_idx]
            ws_id, start_time, end_time = slot

            watchstation = next((ws for ws in params.watchstations if ws.id == ws_id), None)
            if not watchstation:
                continue

            for person_index, person in enumerate(params.watchstanders):
                if watchbill[person_index, day_index, s_idx] == 1:
                    assignment = Assignment(
                        watchstander=person,
                        watchstation=watchstation,
                        date=day,
                        start_time=start_time,
                        end_time=end_time,
                    )
                    assignments.append(assignment)

    return WatchbillResponse(
        assignments=assignments,
        score_history=score_history,
        complete=complete,
    )