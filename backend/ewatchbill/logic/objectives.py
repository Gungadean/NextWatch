#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
from typing import Callable, List, Tuple

import numpy as np

ILLEGAL_SCHEDULE_PENALTY = 1000000


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


def calculate_soft_penalties(
        schedule: np.ndarray,
        min_days_off: int,
        max_days_off: int,
        headcount_matrix: np.ndarray,
        conflict_matrix: np.ndarray,
        qualification_matrix: np.ndarray,
        shift_times: List[Tuple[float, float]]
) -> float:
    """
    Calculates penalties
    """
    penalty = 0.0
    n_people, n_days, n_slots = schedule.shape

    # Headcount Penalties
    if headcount_matrix is not None:
        assignments_per_day_station = np.sum(schedule, axis=0)
        shortfalls = headcount_matrix - assignments_per_day_station

        for d in range(n_days):
            for s in range(n_slots):
                shortfall = int(shortfalls[d, s])
                if shortfall > 0:
                    for i in range(shortfall):
                        if i == 0:
                            penalty += 100000
                        elif i == 1:
                            penalty += 10000
                        else:
                            penalty += 1000

        # Min Days Off Penalties
        if min_days_off > 0:
            person_duty_days = np.sum(schedule, axis=2) > 0
            for person in range(n_people):
                duty_days = np.where(person_duty_days[person])[0]
                if len(duty_days) > 1:
                    gaps = np.diff(duty_days)

                    # Normal penalties for compressing requested days off (gap > 1)
                    normal_violations = np.sum((gaps > 1) & (gaps <= min_days_off))
                    penalty += normal_violations * 500

                    # Evaluate consecutive calendar days (gap == 1)
                    consecutive_indices = np.where(gaps == 1)[0]
                    for idx in consecutive_indices:
                        d1 = duty_days[idx]
                        d2 = duty_days[idx + 1]

                        # Find exactly which shifts they worked on those days
                        s1_arr = np.where(schedule[person, d1] == 1)[0]
                        s2_arr = np.where(schedule[person, d2] == 1)[0]

                        for s1 in s1_arr:
                            for s2 in s2_arr:
                                st1, et1 = shift_times[s1]
                                st2, et2 = shift_times[s2]

                                # Calculate absolute end time of Shift 1
                                abs_end1 = d1 * 24.0 + et1
                                if st1 >= et1 and not (st1 == 0.0 and et1 == 24.0):
                                    abs_end1 += 24.0

                                # Calculate absolute start time of Shift 2
                                abs_start2 = d2 * 24.0 + st2

                                rest_hours = abs_start2 - abs_end1

                                if rest_hours <= 0:
                                    penalty += 500000  # No physical rest
                                else:
                                    penalty += 10000  # Violated min_days_off, but safely

    # Max Days Off Penalties
    if 0 < max_days_off < n_days:
        person_duty_days = np.sum(schedule, axis=2) > 0
        for person in range(n_people):
            active_mask = person_duty_days[person] | (conflict_matrix[person] == 1)
            active_days = np.where(active_mask)[0]

            # They don't work at all
            if len(active_days) == 0:
                penalty += get_exponential_gap_penalty(n_days, max_days_off)
                continue

            # Leading gaps
            if active_days[0] > max_days_off:
                penalty += get_exponential_gap_penalty(active_days[0], max_days_off)

            # Middle gaps
            if len(active_days) > 1:
                gaps = np.diff(active_days) - 1
                violations = gaps[gaps > max_days_off]
                for gap in violations:
                    penalty += get_exponential_gap_penalty(gap, max_days_off)

            # Trailing gap
            trailing_days = (n_days - 1) - active_days[-1]
            if trailing_days > max_days_off:
                penalty += get_exponential_gap_penalty(trailing_days, max_days_off)

    for person in range(n_people):
        # Only penalize if the person is actually qualified for at least one station
        if np.sum(qualification_matrix[person]) > 0:
            total_shifts = np.sum(schedule[person, :, :])
            if total_shifts == 0:
                penalty += 5000

    return penalty


def get_exponential_gap_penalty(gap_size: int, max_days_off: int) -> float:
    """
    Apply exponential penalty for an increasing window size above max
    days off.
    """
    excess = gap_size - max_days_off
    if excess <= 0:
        return 0.0

    total_penalty = 0.0
    for k in range(1, excess + 1):
        window_size = max_days_off + k
        # Calculate how many times this specific window size fits inside the total gap
        count = gap_size - window_size + 1

        weight = int(10 * (2 ** (k - 1)))
        if weight > 50000:
            weight = 50000

        total_penalty += count * weight

    return float(total_penalty)


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
    min_days_off: int,
    max_days_off: int,
    headcount_matrix: np.ndarray,
    conflict_matrix: np.ndarray,
    qualification_matrix: np.ndarray,
    shift_times: List[Tuple[float, float]]
) -> float:
    badness = badness_array(schedule, holiday_mask)
    if np.isnan(badness).any():
        raise ValueError("Badness calculation resulted in NaN.")

    badness = badness - offset_matrix

    badness_standard_deviation = np.std(badness)

    soft_penalties = calculate_soft_penalties(
        schedule, min_days_off, max_days_off, headcount_matrix, conflict_matrix, qualification_matrix, shift_times
    )

    is_legal_schedule = is_legal(schedule)

    return round(
        badness_standard_deviation + soft_penalties
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