#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#  Modified by Ryan Huston. 2026

from typing import Callable

import numpy as np

ILLEGAL_SCHEDULE_PENALTY = 20


def badness_array(
    schedule: np.ndarray,
    holiday_mask: np.ndarray,
) -> np.ndarray:
    saturday_value = 7
    sunday_value = 6
    friday_value = 5
    weekday_value = 4

    # Identify days where each person has duty (people x days)
    has_duty = (
        np.sum(schedule, axis=2) == 1
    )  # Sum across watchstation dimension

    # Create a padded version of holiday mask to handle the "next day" lookup
    padded_holiday = np.append(holiday_mask, [holiday_mask[-1]])
    next_day_holiday = padded_holiday[1 : len(holiday_mask) + 1]

    # Reshape for broadcasting
    holiday_reshaped = holiday_mask.reshape(1, -1)  # 1 x days
    next_day_reshaped = next_day_holiday.reshape(1, -1)  # 1 x days

    # Create masks for all people at once
    weekday_mask = (
        (holiday_reshaped == 0) & (next_day_reshaped == 0) & has_duty
    )
    friday_mask = (holiday_reshaped == 0) & (next_day_reshaped == 1) & has_duty
    sunday_mask = (holiday_reshaped == 1) & (next_day_reshaped == 0) & has_duty
    saturday_mask = (
        (holiday_reshaped == 1) & (next_day_reshaped == 1) & has_duty
    )

    # Calculate badness for each person
    badness_array = (
        np.sum(weekday_mask, axis=1) * weekday_value
        + np.sum(friday_mask, axis=1) * friday_value
        + np.sum(sunday_mask, axis=1) * sunday_value
        + np.sum(saturday_mask, axis=1) * saturday_value
    )

    # Set badness to 0 for people with no duties
    no_duties = ~np.any(has_duty, axis=1)
    badness_array[no_duties] = 0.0

    return badness_array


def days_between_watches_reciprocals(schedule: np.ndarray) -> np.ndarray:
    person_duty_days = np.sum(schedule, axis=2) > 0
    n_people = person_duty_days.shape[0]
    gap_reciprocals = np.zeros(n_people)

    for person in range(n_people):
        duty_days = np.where(person_duty_days[person])[0]
        if len(duty_days) <= 1:
            continue

        # Calculate gaps between consecutive duty days
        gaps = np.diff(duty_days)
        sum_gap_reciprocals = np.sum(1.0 / gaps) if len(gaps) > 0 else 0.0
        gap_reciprocals[person] = sum_gap_reciprocals

    return gap_reciprocals


def badness_standard_deviation_objective(
    schedule: np.ndarray,
    holiday_mask: np.ndarray,
    is_legal: Callable[[np.ndarray], bool],
    offset_matrix: np.ndarray,
) -> float:
    badness = badness_array(schedule, holiday_mask)
    if np.isnan(badness).any():
        raise ValueError("Badness calculation resulted in NaN.")

    badness = badness - offset_matrix

    badness_standard_deviation = np.std(badness)

    is_legal_schedule = is_legal(schedule)

    return round(
        badness_standard_deviation
        + (0 if is_legal_schedule else ILLEGAL_SCHEDULE_PENALTY),
        2,
    )


def badness_days_between_watches_objective(
    schedule: np.ndarray,
    is_legal: Callable[[np.ndarray], bool],
) -> float:
    gap_reciprocals = days_between_watches_reciprocals(schedule)
    if np.isnan(gap_reciprocals).any():
        raise ValueError("Gap reciprocals calculation resulted in NaN.")

    gap_reciprocals = gap_reciprocals

    gap_reciprocal_std = np.std(gap_reciprocals)

    is_legal_schedule = is_legal(schedule)

    return round(
        gap_reciprocal_std
        + (0 if is_legal_schedule else ILLEGAL_SCHEDULE_PENALTY),
        2,
    )