#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#  Modified by Ryan Huston. 2026

import numpy as np

from ewatchbill.models import WatchbillParams


def from_watchbill_request(params: WatchbillParams):
    start_date = params.start
    end_date = params.end
    holiday_dates = params.holidays
    conflicts = params.conflicts

    num_days = (end_date - start_date).days + 1
    num_people = len(params.watchstanders)
    num_watchstations = len(params.watchstations)

    qualification_matrix = np.zeros((num_people, num_watchstations), dtype=int)
    for person_index, watchstander in enumerate(params.watchstanders):
        for watchstation_id in watchstander.watchstations:
            watchstation_index = next(
                (
                    j
                    for j, ws in enumerate(params.watchstations)
                    if ws.id == watchstation_id
                ),
                None,
            )
            if watchstation_index is not None:
                qualification_matrix[person_index, watchstation_index] = 1

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

    return (
        qualification_matrix,
        conflict_matrix,
        holiday_mask,
        offset_matrix,
        params.min_days_off_between_duty,
    )