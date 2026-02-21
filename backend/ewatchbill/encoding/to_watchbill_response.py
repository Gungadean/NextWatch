#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#  Modified by Ryan Huston. 2026

from datetime import timedelta

import numpy as np

from ewatchbill.models import Assignment, WatchbillParams, WatchbillResponse


def to_watchbill_response(
    watchbill: np.ndarray,
    params: WatchbillParams,
    score_history: list[float],
    complete: bool,
) -> WatchbillResponse:
    """
    Convert the watchbill to a WatchbillResponse object.
    """
    start_date = params.start
    end_date = params.end
    num_days = (end_date - start_date).days + 1

    assignments = []
    for day_index in range(num_days):
        day = start_date + timedelta(days=day_index)
        for watchstation_index, watchstation in enumerate(
            params.watchstations
        ):
            for person_index, person in enumerate(params.watchstanders):
                if watchbill[person_index, day_index, watchstation_index] == 1:
                    assignment = Assignment(
                        watchstander=person,
                        watchstation=watchstation,
                        date=day,
                    )
                    assignments.append(assignment)

    return WatchbillResponse(
        assignments=assignments,
        score_history=score_history,
        complete=complete,
    )