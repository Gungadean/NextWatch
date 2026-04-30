#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#
#  Modified by Ryan Huston 2026

import logging
import json
import traceback
import numpy as np
from fastapi import Request

from .encoding.from_watchbill_request import from_watchbill_request
from .encoding.to_watchbill_response import to_watchbill_response
from .logic.make_schedule import make_schedule
from .logic.exceptions.IllegalScheduleException import IllegalScheduleException
from .logic.objectives import get_score_breakdown
from .logic.translator import ScheduleTranslator
from .models import WatchbillParams, WatchbillResponse


async def schedule_message_generator(
        public_id: str,
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
        max_days_off_between_duty,
        headcount_matrix,
        shift_times,
        unique_shift_slots,
        frozen_assignments_matrix
    ) = from_watchbill_request(watchbill_params)
    scores = []
    best_schedule = None

    total_steps = watchbill_params.max_iteration_steps

    try:
        translator = ScheduleTranslator(
            watchstanders=watchbill_params.watchstanders,
            watchstations=watchbill_params.watchstations,
            unique_shift_slots=unique_shift_slots,
            start_date=watchbill_params.start
        )

        for i, (schedule, schedule_score, is_legal) in enumerate(
                make_schedule(
                    num_people=len(watchbill_params.watchstanders),
                    num_days=(watchbill_params.end - watchbill_params.start).days
                             + 1,
                    num_watchstations=len(unique_shift_slots),
                    min_days_off_between_duty=min_days_off_between_duty,
                    max_days_off_between_duty=max_days_off_between_duty,
                    max_steps=watchbill_params.max_iteration_steps,
                    qualification_matrix=qualification_matrix,
                    conflict_matrix=conflict_matrix,
                    holiday_mask=holiday_mask,
                    offset_matrix=offset_matrix,
                    headcount_matrix=headcount_matrix,
                    shift_times=shift_times,
                    translator=translator,
                    frozen_assignments_matrix=frozen_assignments_matrix
                )
        ):
            scores.append(schedule_score)

            # Check for client disconnect
            if await request.is_disconnected():
                break

            # Update best schedule
            if best_schedule is None or not np.array_equal(
                    schedule, best_schedule
            ):
                best_schedule = schedule

            # Yield Progress (Lightweight)
            # Send update every 100 steps
            if i % 100 == 0:
                progress_data = {
                    "type": "progress",
                    "step": i,
                    "total": total_steps,
                    "percent": round((i / total_steps) * 100),
                    "current_score": schedule_score
                }
                yield {"data": json.dumps(progress_data)}

    except IllegalScheduleException as e:
        response = WatchbillResponse(
            score_history=[],
            assignments=[],
            complete=True,
            error=str(e),
        )
        yield {"data": json.dumps({"type": "error", "payload": response.model_dump()})}
        return
    except Exception as e:
        logging.error(f"Unexpected error: {traceback.format_exc()}")
        response = WatchbillResponse(
            score_history=[],
            assignments=[],
            complete=True,
            error="An unexpected error occurred.",
        )
        yield {"data": json.dumps({"type": "error", "payload": response.model_dump()})}
        return

    # Run the validator on the final matrix to get the clean UI score
    if best_schedule is not None:
        breakdown, _ = get_score_breakdown(
            schedule=best_schedule,
            holiday_mask=holiday_mask,
            offset_matrix=offset_matrix,
            min_days_off=min_days_off_between_duty,
            max_days_off=max_days_off_between_duty,
            headcount_matrix=headcount_matrix,
            conflict_matrix=conflict_matrix,
            shift_times=shift_times,
            translator=translator
        )

        # Overwrite the final score in the history array.
        if scores:
            scores[-1] = breakdown["Total Score"]

    # Final Result (Heavyweight)
    final_response = to_watchbill_response(
        watchbill=best_schedule,
        params=watchbill_params,
        score_history=scores,
        complete=True,
        unique_shift_slots=unique_shift_slots,
    )
    cache[public_id] = final_response
    yield {
        "data": json.dumps(
            {
                "type": "result",
                "payload": final_response.model_dump(mode="json")
            }
        )
    }
