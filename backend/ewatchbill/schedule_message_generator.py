#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#  Modified by Ryan Huston. 2026

import logging

import numpy as np
from fastapi import Request

from encoding.from_watchbill_request import from_watchbill_request
from encoding.to_watchbill_response import to_watchbill_response
from logic.make_schedule import make_schedule
from logic.exceptions import IllegalScheduleException
from models import WatchbillParams, WatchbillResponse


async def schedule_message_generator(
    id: str,
    cache: dict[str, WatchbillResponse],
    request: Request,
    watchbill_params: WatchbillParams,
):
    (
        qualification_matrix,
        conflict_matrix,
        holiday_mask,
        offset_matrix,
        min_days_off_between_duty,
    ) = from_watchbill_request(watchbill_params)
    scores = []
    best_schedule = None
    try:
        for i, (schedule, schedule_score, is_legal) in enumerate(
            make_schedule(
                num_people=len(watchbill_params.watchstanders),
                num_days=(watchbill_params.end - watchbill_params.start).days
                + 1,
                num_watchstations=len(watchbill_params.watchstations),
                min_days_off_between_duty=min_days_off_between_duty,
                max_steps=watchbill_params.max_iteration_steps,
                qualification_matrix=qualification_matrix,
                conflict_matrix=conflict_matrix,
                holiday_mask=holiday_mask,
                offset_matrix=offset_matrix,
            )
        ):
            scores.append(schedule_score)
            if await request.is_disconnected():
                break
            if best_schedule is None or not np.array_equal(
                schedule, best_schedule
            ):
                best_schedule = schedule
            if is_legal and i % 100 == 0:
                response = to_watchbill_response(
                    watchbill=schedule,
                    params=watchbill_params,
                    score_history=scores,
                    complete=False,
                )
                yield {"data": response.model_dump_json()}
    except IllegalScheduleException:
        response = WatchbillResponse(
            score_history=[],
            assignments=[],
            complete=True,
            error="Unable to generate a schedule that meets the constraints.",
        )
        yield {"data": response.model_dump_json()}
        return
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        response = WatchbillResponse(
            score_history=[],
            assignments=[],
            complete=True,
            error="An unexpected error occurred.",
        )
        yield {"data": response.model_dump_json()}
        return
    final_response = to_watchbill_response(
        watchbill=best_schedule,
        params=watchbill_params,
        score_history=scores,
        complete=True,
    )
    cache[id] = final_response
    yield {"data": final_response.model_dump_json()}