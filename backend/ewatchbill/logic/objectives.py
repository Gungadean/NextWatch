#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
from typing import List, Tuple, Dict, Set

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


class DeltaScorer:
    """
    Lightning-fast objective evaluator. Caches the initial schedule scores
    and only recalculates the exact individuals modified during a perturbation.
    """

    def __init__(self, schedule: np.ndarray, holiday_mask: np.ndarray, offset_matrix: np.ndarray,
                 min_days_off: int, max_days_off: int, headcount_matrix: np.ndarray,
                 conflict_matrix: np.ndarray, qualification_matrix: np.ndarray, shift_times: List[Tuple[float, float]]):
        self.schedule = schedule
        self.holiday_mask = holiday_mask
        self.offset_matrix = offset_matrix
        self.min_days_off = min_days_off
        self.max_days_off = max_days_off
        self.headcount_matrix = headcount_matrix
        self.conflict_matrix = conflict_matrix
        self.qualification_matrix = qualification_matrix
        self.shift_times = shift_times

        self.n_people, self.n_days, self.n_slots = schedule.shape

        # Cache
        self.person_badness = np.zeros(self.n_people)
        self.person_penalties = np.zeros(self.n_people)
        self.headcount_penalty = self._calculate_global_headcount()

        # Initial Population of the Cache
        for p in range(self.n_people):
            self.person_badness[p] = self._calc_person_badness(p)
            self.person_penalties[p] = self._calc_person_penalty(p)

    def get_total_score(self) -> float:
        """Instantly calculates the global score using cached arrays"""
        std_dev = np.std(self.person_badness)
        total_soft = np.sum(self.person_penalties)
        return round(float(std_dev + total_soft + self.headcount_penalty), 2)

    def apply_changes_and_score(self, receipt: List[Tuple[int, int, int, int]]) -> Tuple[float, Set[int], Dict, Dict]:
        """Applies an in-place mutation, recalculates ONLY the affected people, and returns the new score."""
        affected_people = {r[0] for r in receipt}

        # Save old cached scores for rollback
        old_badness = {p: self.person_badness[p] for p in affected_people}
        old_penalties = {p: self.person_penalties[p] for p in affected_people}

        # Recalculate ONLY the affected people
        for p in affected_people:
            self.person_badness[p] = self._calc_person_badness(p)
            self.person_penalties[p] = self._calc_person_penalty(p)

        return self.get_total_score(), affected_people, old_badness, old_penalties

    def rollback(self, receipt: List[Tuple[int, int, int, int]], affected_people: Set[int], old_badness: Dict,
                 old_penalties: Dict):
        """Instantly reverts a rejected mutation without copying arrays."""
        # Inverse the receipt
        for p, d, s, old_val in receipt:
            self.schedule[p, d, s] = old_val

            # Restore the cache
        for p in affected_people:
            self.person_badness[p] = old_badness[p]
            self.person_penalties[p] = old_penalties[p]

    def _calculate_global_headcount(self) -> float:
        """Runs ONCE on initialization. Normal shift swaps do not change total headcount"""
        penalty = 0.0
        if self.headcount_matrix is not None:
            assignments_per_day_station = np.sum(self.schedule, axis=0)
            shortfalls = self.headcount_matrix - assignments_per_day_station
            for d in range(self.n_days):
                for s in range(self.n_slots):
                    shortfall = int(shortfalls[d, s])
                    if shortfall > 0:
                        for i in range(shortfall):
                            if i == 0:
                                penalty += 100000
                            elif i == 1:
                                penalty += 10000
                            else:
                                penalty += 1000
        return penalty

    def _calc_person_badness(self, p: int) -> float:
        """Calculates Base Fairness for a single person"""
        single_person_schedule = self.schedule[p:p + 1, :, :]
        badness = badness_array(single_person_schedule, self.holiday_mask)[0]
        return badness - self.offset_matrix[p]

    def _calc_person_penalty(self, p: int) -> float:
        """Calculates Fatigue, Engagement, and Benchwarmer penalties for ONE person"""
        penalty = 0.0

        # Min Days Off / Fatigue Penalties
        if self.min_days_off > 0:
            person_duty_days = np.sum(self.schedule[p], axis=1) > 0
            duty_days = np.where(person_duty_days)[0]

            if len(duty_days) > 1:
                gaps = np.diff(duty_days)

                # Normal calendar violations
                normal_violations = np.sum((gaps > 1) & (gaps <= self.min_days_off))
                penalty += normal_violations * 500

                # Physical Rest Violations (Consecutive calendar days)
                consecutive_indices = np.where(gaps == 1)[0]
                for idx in consecutive_indices:
                    d1, d2 = duty_days[idx], duty_days[idx + 1]
                    s1_arr = np.where(self.schedule[p, d1] == 1)[0]
                    s2_arr = np.where(self.schedule[p, d2] == 1)[0]

                    for s1 in s1_arr:
                        for s2 in s2_arr:
                            st1, et1 = self.shift_times[s1]
                            st2, et2 = self.shift_times[s2]

                            abs_end1 = d1 * 24.0 + et1
                            if st1 >= et1 and not (st1 == 0.0 and et1 == 24.0):
                                abs_end1 += 24.0
                            abs_start2 = d2 * 24.0 + st2

                            rest_hours = abs_start2 - abs_end1

                            if rest_hours <= 0:
                                penalty += 500000  # Penalty for zero rest
                            else:
                                penalty += 10000  # High penalty for back-to-back safely

        # Max Days Off / Engagement Penalties
        if 0 < self.max_days_off < self.n_days:
            person_duty_days = np.sum(self.schedule[p], axis=1) > 0
            active_mask = person_duty_days | (self.conflict_matrix[p] == 1)
            active_days = np.where(active_mask)[0]

            if len(active_days) > 1:
                gaps = np.diff(active_days) - 1
                violations = gaps[gaps > self.max_days_off]
                for gap in violations:
                    penalty += get_exponential_gap_penalty(gap, self.max_days_off)

        # Fair Utilization (Anti-Benchwarmer)
        # Add penalty if a qualified and available person isn't schedule for any shifts.
        if np.sum(self.schedule[p, :, :]) == 0:
            penalty += 5000

        return penalty