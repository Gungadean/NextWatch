#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon

from typing import List, Tuple, Dict, Set
import numpy as np
from ewatchbill.logic.translator import ScheduleTranslator


class PENALTY:
    """
    Penalty variables
    """
    FATIGUE_OVERLAP = 100000000
    FATIGUE_MAX_SHIFT = 100000000
    HEADCOUNT_MISSING_1 = 100000000
    TARGET_HOURS_HARD = 100000000

    HEADCOUNT_MISSING_2 = 10000000
    FATIGUE_CRITICAL_REST = 5000000
    FATIGUE_MAX_CONSECUTIVE = 2500000
    FATIGUE_MIN_DAYS_OFF = 2500000
    HEADCOUNT_MISSING_3 = 1000000

    FATIGUE_MIN_CONSECUTIVE = 500000
    FATIGUE_SHIFT_SWITCH = 150000
    SCHEDULING_FRAGMENTATION = 15000
    UTILIZATION_BENCHED = 50000

    TARGET_HOURS_SOFT = 1500
    TARGET_MAX_DAYS_OFF = 25000
    FAIRNESS_MULTIPLIER = 500


def badness_array(schedule: np.ndarray, holiday_mask: np.ndarray) -> np.ndarray:
    saturday_value = 7
    sunday_value = 6
    friday_value = 5
    weekday_value = 4

    has_duty = (np.sum(schedule, axis=2) == 1)

    # Create a padded version of holiday mask to handle the "next day" lookup
    padded_holiday = np.append(holiday_mask, [holiday_mask[-1]])
    next_day_holiday = padded_holiday[1: len(holiday_mask) + 1]

    holiday_reshaped = holiday_mask.reshape(1, -1)
    next_day_reshaped = next_day_holiday.reshape(1, -1)

    weekday_mask = ((holiday_reshaped == 0) & (next_day_reshaped == 0) & has_duty)
    friday_mask = ((holiday_reshaped == 0) & (next_day_reshaped == 1) & has_duty)
    sunday_mask = ((holiday_reshaped == 1) & (next_day_reshaped == 0) & has_duty)
    saturday_mask = ((holiday_reshaped == 1) & (next_day_reshaped == 1) & has_duty)

    badness_arr = (
            np.sum(weekday_mask, axis=1) * weekday_value
            + np.sum(friday_mask, axis=1) * friday_value
            + np.sum(sunday_mask, axis=1) * sunday_value
            + np.sum(saturday_mask, axis=1) * saturday_value
    )

    # Set badness to 0 for people with no duties
    no_duties = ~np.any(has_duty, axis=1)
    badness_arr[no_duties] = 0.0

    return badness_arr


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

        weight = int(PENALTY.TARGET_MAX_DAYS_OFF * (2 ** (k - 1)))
        if weight > 5000000:
            weight = 5000000

        total_penalty += count * weight

    return float(total_penalty)


def get_score_breakdown(
        schedule: np.ndarray,
        holiday_mask: np.ndarray,
        offset_matrix: np.ndarray,
        min_days_off: int,
        max_days_off: int,
        headcount_matrix: np.ndarray,
        conflict_matrix: np.ndarray,
        shift_times: List[Tuple[float, float]],
        translator: ScheduleTranslator,
        target_weekly_hours: int = 40
) -> Tuple[Dict[str, float], List[str]]:
    """
    Create breakdown of fairness results and create a list of any warnings/violations encountered.
    """
    breakdown = {
        "Base Fairness (Std Dev)": 0.0,
        "Headcount (Empty Shifts)": 0.0,
        "Fatigue (Min Days Off)": 0.0,
        "Target Hours (Hard Limit)": 0.0,
        "Target Hours (Soft Balance)": 0.0,
        "Engagement (Max Days Off)": 0.0,
        "Utilization (Benched)": 0.0,
        "Total Score": 0.0
    }

    detailed_warnings = []
    n_people, n_days, n_slots = schedule.shape

    badness = badness_array(schedule, holiday_mask)
    badness = badness - offset_matrix
    breakdown["Base Fairness (Std Dev)"] = round(float(np.std(badness)) * PENALTY.FAIRNESS_MULTIPLIER, 2)

    # Headcount Penalties
    if headcount_matrix is not None:
        assignments_per_day_station = np.sum(schedule, axis=0)
        for d in range(n_days):
            for s in range(n_slots):
                required = int(headcount_matrix[d, s])
                if required == -1: continue

                if required > 0:
                    shortfall = required - int(assignments_per_day_station[d, s])
                    if shortfall > 0:
                        detailed_warnings.append(
                            f"Headcount: Missing {shortfall} person(s) for {translator.get_station(s)} on {translator.get_date(d)}.")

                        for i in range(shortfall):
                            if i == 0:
                                breakdown["Headcount (Empty Shifts)"] += PENALTY.HEADCOUNT_MISSING_1
                            elif i == 1:
                                breakdown["Headcount (Empty Shifts)"] += PENALTY.HEADCOUNT_MISSING_2
                            else:
                                breakdown["Headcount (Empty Shifts)"] += PENALTY.HEADCOUNT_MISSING_3

    # Prevent individuals from being cloned into multiple seats simultaneously
    for p in range(n_people):
        cloned_shifts = np.sum(schedule[p] > 1)
        if cloned_shifts > 0:
            detailed_warnings.append(
                f"Cloned Assignment: {translator.get_person(p)} is illegally assigned to the exact same chair multiple times.")
            breakdown["Fatigue (Min Days Off)"] += cloned_shifts * PENALTY.FATIGUE_OVERLAP

    # Evaluate schedules on a per-person basis
    for p in range(n_people):
        person_duty_days = np.sum(schedule[p], axis=1) > 0
        duty_days = np.where(person_duty_days)[0]
        total_hours = 0.0
        absolute_shifts = []

        for d in duty_days:
            worked_slots = np.where(schedule[p, d] > 0)[0]
            for s in worked_slots:
                count = int(schedule[p, d, s])
                for _ in range(count):
                    st, et = shift_times[s]
                    dur = et - st if et > st else (et + 24.0) - st
                    if dur == 0: dur = 24.0
                    total_hours += dur

                    abs_start = d * 24.0 + st
                    abs_end = d * 24.0 + et
                    if et <= st and not (st == 0.0 and et == 24.0): abs_end += 24.0
                    absolute_shifts.append((abs_start, abs_end, d, s))

        absolute_shifts.sort(key=lambda x: x[0])
        ws_obj = translator.watchstanders[p]
        max_len = ws_obj.get('max_shift_length') if isinstance(ws_obj, dict) else getattr(ws_obj, 'max_shift_length', None)
        max_consec = ws_obj.get('max_consecutive_days') if isinstance(ws_obj, dict) else getattr(ws_obj, 'max_consecutive_days', None)
        min_consec = ws_obj.get('min_consecutive_days') if isinstance(ws_obj, dict) else getattr(ws_obj, 'min_consecutive_days', None)

        is_block_worker = max_consec is not None and max_consec > 1

        # Evaluate calendar blocks for contractors
        if is_block_worker and len(duty_days) > 0:
            blocks = []
            current_block = [duty_days[0]]
            for d in duty_days[1:]:
                if d == current_block[-1] + 1:
                    current_block.append(d)
                else:
                    blocks.append(current_block)
                    current_block = [d]
            blocks.append(current_block)

            for b in blocks:
                b_len = len(b)
                if max_consec and b_len > max_consec:
                    detailed_warnings.append(
                        f"Fatigue: {translator.get_person(p)} exceeded max consecutive shifts ({max_consec} days).")
                    breakdown["Fatigue (Min Days Off)"] += (b_len - max_consec) * PENALTY.FATIGUE_MAX_CONSECUTIVE

                is_boundary = (b[0] == 0) or (b[-1] == n_days - 1)
                if min_consec and b_len < min_consec and not is_boundary:
                    detailed_warnings.append(
                        f"Scheduling: {translator.get_person(p)} failed to meet minimum consecutive shifts ({min_consec} days).")
                    breakdown["Fatigue (Min Days Off)"] += (min_consec - b_len) * PENALTY.FATIGUE_MIN_CONSECUTIVE

        # Evaluate linear time blocks for overlaps, shift limits, consecutive blocks, and minimum rest
        if absolute_shifts:
            current_start, current_end, prev_d, prev_s = absolute_shifts[0]

            for st, et, d, s in absolute_shifts[1:]:
                gap = round(st - current_end, 2)

                if gap < 0:
                    detailed_warnings.append(
                        f"Overlapping Shifts: {translator.get_person(p)} is scheduled for overlapping times.")
                    breakdown["Fatigue (Min Days Off)"] += PENALTY.FATIGUE_OVERLAP
                    current_end = max(current_end, et)
                elif gap == 0:
                    current_end = max(current_end, et)
                    if d != prev_d:
                        detailed_warnings.append(f"Shift Switch: {translator.get_person(p)} changes shift timings on contiguous days ({translator.get_date(prev_d)} to {translator.get_date(d)}).")
                        breakdown["Fatigue (Min Days Off)"] += PENALTY.FATIGUE_SHIFT_SWITCH
                else:
                    dur = round(current_end - current_start, 2)
                    if max_len and dur > max_len:
                        detailed_warnings.append(
                            f"Max Shift Exceeded: {translator.get_person(p)} works {dur} hours continuously (Limit: {max_len}hr).")
                        breakdown["Fatigue (Min Days Off)"] += PENALTY.FATIGUE_MAX_SHIFT
                    elif dur > 24.0:
                        detailed_warnings.append(
                            f"Critical Fatigue: {translator.get_person(p)} works {dur} hours continuously.")
                        breakdown["Fatigue (Min Days Off)"] += PENALTY.FATIGUE_CRITICAL_REST

                    # Shift Switch (Day to Night on back-to-back calendar days)
                    if d == prev_d + 1:
                        prev_st_hr = shift_times[prev_s][0]
                        curr_st_hr = shift_times[s][0]
                        if prev_st_hr != curr_st_hr:
                            detailed_warnings.append(
                                f"Shift Switch: {translator.get_person(p)} changes shift timings on consecutive days ({translator.get_date(prev_d)} to {translator.get_date(d)}).")
                            breakdown["Fatigue (Min Days Off)"] += PENALTY.FATIGUE_SHIFT_SWITCH

                    # Independent worker rest rules
                    if not is_block_worker:
                        if gap < 12.0:
                            detailed_warnings.append(f"Short Rest: {translator.get_person(p)} has only {gap} hours rest between shifts.")
                            breakdown["Fatigue (Min Days Off)"] += PENALTY.FATIGUE_CRITICAL_REST
                        elif min_days_off > 0:
                            required_rest = min_days_off * 24.0
                            if gap < required_rest:
                                detailed_warnings.append(f"Fatigue: {translator.get_person(p)} had {gap}hrs rest (Required: {required_rest}hrs).")
                                breakdown["Fatigue (Min Days Off)"] += (required_rest - gap) * PENALTY.FATIGUE_MIN_DAYS_OFF

                    # Block workers just need physical safety gaps, calendar rest handled above
                    else:
                        if gap < 12.0:
                            detailed_warnings.append(f"Short Rest: {translator.get_person(p)} has only {gap} hours rest between shifts.")
                            breakdown["Fatigue (Min Days Off)"] += PENALTY.FATIGUE_CRITICAL_REST

                    current_start, current_end, prev_d, prev_s = st, et, d, s

            dur = round(current_end - current_start, 2)
            if max_len and dur > max_len:
                detailed_warnings.append(f"Max Shift Exceeded: {translator.get_person(p)} works {dur} hours continuously (Limit: {max_len}hr).")
                breakdown["Fatigue (Min Days Off)"] += PENALTY.FATIGUE_MAX_SHIFT
            elif dur > 24.0:
                detailed_warnings.append(f"Critical Fatigue: {translator.get_person(p)} works {dur} hours continuously.")
                breakdown["Fatigue (Min Days Off)"] += PENALTY.FATIGUE_CRITICAL_REST

        # Evaluate target hours
        conflict_days = np.sum(conflict_matrix[p])
        available_days = max(0, n_days - conflict_days)
        target_weekly = ws_obj.get('target_weekly_hours') if isinstance(ws_obj, dict) else getattr(ws_obj,
                                                                                                   'target_weekly_hours',
                                                                                                   None)

        if target_weekly is None:
            prorated_target = target_weekly_hours * (available_days / 7.0)
            diff = abs(total_hours - prorated_target)
            if diff > 4.0:
                status = "over" if total_hours > prorated_target else "under"
                detailed_warnings.append(
                    f"Target Hours: {translator.get_person(p)} is scheduled for {total_hours} hours ({round(diff)} hrs {status} prorated target of {round(prorated_target)}).")

            # Square the difference to make the penalties higher the further from the target they are.
            breakdown["Target Hours (Soft Balance)"] += (diff ** 2) * PENALTY.TARGET_HOURS_SOFT
        else:
            prorated_target = target_weekly * (available_days / 7.0)
            grace_buffer = max_len if max_len else 12.0

            if total_hours < prorated_target:
                diff = prorated_target - total_hours
                if diff > grace_buffer:
                    detailed_warnings.append(
                        f"Strict Target: {translator.get_person(p)} is short of their prorated {round(prorated_target)}hr requirement.")
                    breakdown["Target Hours (Hard Limit)"] += diff * PENALTY.TARGET_HOURS_HARD
                else:
                    # Square the difference to make the penalties higher the further from the target they are.
                    breakdown["Target Hours (Soft Balance)"] += (diff ** 2) * PENALTY.TARGET_HOURS_SOFT
            elif total_hours > prorated_target:
                diff = total_hours - prorated_target
                if diff > grace_buffer:
                    detailed_warnings.append(
                        f"Strict Target: {translator.get_person(p)} exceeded their prorated {round(prorated_target)}hr limit.")
                    breakdown["Target Hours (Hard Limit)"] += diff * PENALTY.TARGET_HOURS_HARD
                else:
                    # Square the difference to make the penalties higher the further from the target they are.
                    breakdown["Target Hours (Soft Balance)"] += (diff ** 2) * PENALTY.TARGET_HOURS_SOFT

        # Evaluate maximum permitted days off (Engagement)
        effective_max_days_off = max_days_off

        if target_weekly is not None and target_weekly > 0:
            monthly_target = target_weekly * (available_days / 7.0)
            expected_shifts = monthly_target / 12.0
            if expected_shifts > 0:
                natural_gap = available_days / expected_shifts
                effective_max_days_off = max(effective_max_days_off, int(natural_gap * 1.5))

        if 0 < effective_max_days_off < n_days:
            active_mask = person_duty_days | (conflict_matrix[p] == 1)
            active_days = np.where(active_mask)[0]

            if len(active_days) > 0:
                padded_active = np.insert(active_days, 0, -1)
                padded_active = np.append(padded_active, n_days)
                gaps = np.diff(padded_active) - 1

                for idx, gap in enumerate(gaps):
                    if gap > effective_max_days_off:
                        gap_start = int(padded_active[idx]) + 1
                        detailed_warnings.append(f"Engagement: {translator.get_person(p)} is benched for {gap} days starting {translator.get_date(gap_start)} (Max allowed for target hours: {effective_max_days_off}).")
                        breakdown["Engagement (Max Days Off)"] += get_exponential_gap_penalty(gap, effective_max_days_off)

        # Flag qualified users left completely unscheduled
        if available_days > 0 and total_hours == 0:
            detailed_warnings.append(f"Utilization: {translator.get_person(p)} is available but received zero shifts.")
            breakdown["Utilization (Benched)"] += PENALTY.UTILIZATION_BENCHED

    score_keys = [k for k in breakdown.keys() if k not in ["Total Score", "Target Hours (Soft Balance)"]]
    breakdown["Total Score"] = round(sum(breakdown[k] for k in score_keys), 2)
    return breakdown, detailed_warnings


class DeltaScorer:
    """
    Lightning-fast objective evaluator. Caches the initial schedule scores
    and only recalculates the exact individuals modified during a perturbation.
    """

    def __init__(self, schedule: np.ndarray, holiday_mask: np.ndarray, offset_matrix: np.ndarray,
                 min_days_off: int, max_days_off: int, headcount_matrix: np.ndarray,
                 conflict_matrix: np.ndarray, qualification_matrix: np.ndarray, shift_times: List[Tuple[float, float]],
                 translator: ScheduleTranslator, target_weekly_hours: int = 40):
        self.schedule = schedule
        self.holiday_mask = holiday_mask
        self.offset_matrix = offset_matrix
        self.min_days_off = min_days_off
        self.max_days_off = max_days_off
        self.headcount_matrix = headcount_matrix
        self.conflict_matrix = conflict_matrix
        self.qualification_matrix = qualification_matrix
        self.shift_times = shift_times
        self.translator = translator
        self.target_weekly_hours = target_weekly_hours

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
        weighted_std_dev = std_dev * PENALTY.FAIRNESS_MULTIPLIER
        return round(float(weighted_std_dev + total_soft + self.headcount_penalty), 2)

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
        """Evaluates empty shifts globally against the headcount matrix"""
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
                                penalty += PENALTY.HEADCOUNT_MISSING_1
                            elif i == 1:
                                penalty += PENALTY.HEADCOUNT_MISSING_2
                            else:
                                penalty += PENALTY.HEADCOUNT_MISSING_3
        return penalty

    def _calc_person_badness(self, p: int) -> float:
        """Calculates Base Fairness for a single person"""
        single_person_schedule = self.schedule[p:p + 1, :, :]
        badness = badness_array(single_person_schedule, self.holiday_mask)[0]
        return badness - self.offset_matrix[p]

    def _calc_person_penalty(self, p: int) -> float:
        """Calculates Fatigue, Engagement, and Benchwarmer penalties for ONE person"""
        penalty = 0.0

        cloned_shifts = np.sum(self.schedule[p] > 1)
        if cloned_shifts > 0:
            penalty += cloned_shifts * PENALTY.FATIGUE_OVERLAP

        person_duty_days = np.sum(self.schedule[p], axis=1) > 0
        duty_days = np.where(person_duty_days)[0]
        total_hours = 0.0
        absolute_shifts = []

        for d in duty_days:
            worked_slots = np.where(self.schedule[p, d] > 0)[0]
            for s in worked_slots:
                count = int(self.schedule[p, d, s])
                for _ in range(count):
                    st, et = self.shift_times[s]
                    dur = et - st if et > st else (et + 24.0) - st
                    if dur == 0: dur = 24.0
                    total_hours += dur

                    abs_start = d * 24.0 + st
                    abs_end = d * 24.0 + et
                    if et <= st and not (st == 0.0 and et == 24.0): abs_end += 24.0
                    absolute_shifts.append((abs_start, abs_end, d, s))

        absolute_shifts.sort(key=lambda x: x[0])
        ws_obj = self.translator.watchstanders[p]
        max_len = ws_obj.get('max_shift_length') if isinstance(ws_obj, dict) else getattr(ws_obj, 'max_shift_length', None)
        max_consec = ws_obj.get('max_consecutive_days') if isinstance(ws_obj, dict) else getattr(ws_obj, 'max_consecutive_days', None)
        min_consec = ws_obj.get('min_consecutive_days') if isinstance(ws_obj, dict) else getattr(ws_obj, 'min_consecutive_days', None)

        # Evaluate linear time blocks for fatigue constraints
        is_block_worker = max_consec is not None and max_consec > 1

        # Evaluate calendar blocks for contractors
        if is_block_worker and len(duty_days) > 0:
            blocks = []
            current_block = [duty_days[0]]
            for d in duty_days[1:]:
                if d == current_block[-1] + 1:
                    current_block.append(d)
                else:
                    blocks.append(current_block)
                    current_block = [d]
            blocks.append(current_block)

            for b in blocks:
                b_len = len(b)
                if max_consec and b_len > max_consec:
                    penalty += (b_len - max_consec) * PENALTY.FATIGUE_MAX_CONSECUTIVE

                is_boundary = (b[0] == 0) or (b[-1] == self.n_days - 1)
                if min_consec and b_len < min_consec and not is_boundary:
                    penalty += (min_consec - b_len) * PENALTY.FATIGUE_MIN_CONSECUTIVE

        # Evaluate hourly gaps and limits
        if absolute_shifts:
            current_start, current_end, prev_d, prev_s = absolute_shifts[0]

            for st, et, d, s in absolute_shifts[1:]:
                gap = round(st - current_end, 2)

                if gap < 0:
                    penalty += PENALTY.FATIGUE_OVERLAP
                    current_end = max(current_end, et)
                elif gap == 0:
                    current_end = max(current_end, et)
                    if d != prev_d:
                        penalty += PENALTY.FATIGUE_SHIFT_SWITCH
                else:
                    dur = round(current_end - current_start, 2)
                    if max_len and dur > max_len:
                        penalty += PENALTY.FATIGUE_MAX_SHIFT
                    elif dur > 24.0:
                        penalty += PENALTY.FATIGUE_CRITICAL_REST

                    if d == prev_d + 1:
                        prev_st_hr = self.shift_times[prev_s][0]
                        curr_st_hr = self.shift_times[s][0]
                        if prev_st_hr != curr_st_hr:
                            penalty += PENALTY.FATIGUE_SHIFT_SWITCH

                    if not is_block_worker:
                        if gap < 12.0:
                            penalty += PENALTY.FATIGUE_CRITICAL_REST
                        elif self.min_days_off > 0:
                            required_rest = self.min_days_off * 24.0
                            if gap < required_rest:
                                penalty += (required_rest - gap) * PENALTY.FATIGUE_MIN_DAYS_OFF
                    else:
                        if gap < 12.0:
                            penalty += PENALTY.FATIGUE_CRITICAL_REST

                    current_start, current_end, prev_d, prev_s = st, et, d, s

            dur = round(current_end - current_start, 2)
            if max_len and dur > max_len:
                penalty += PENALTY.FATIGUE_MAX_SHIFT
            elif dur > 24.0:
                penalty += PENALTY.FATIGUE_CRITICAL_REST

        # Evaluate target hours
        conflict_days = np.sum(self.conflict_matrix[p])
        available_days = max(0, self.n_days - conflict_days)
        target_weekly = ws_obj.get('target_weekly_hours') if isinstance(ws_obj, dict) else getattr(ws_obj, 'target_weekly_hours', None)

        if target_weekly is None:
            prorated_target = self.target_weekly_hours * (available_days / 7.0)
            diff = abs(total_hours - prorated_target)

            # Square the difference to make the penalties higher the further from the target they are.
            penalty += (diff ** 2) * PENALTY.TARGET_HOURS_SOFT
        else:
            prorated_target = target_weekly * (available_days / 7.0)
            grace_buffer = max_len if max_len else 12.0

            if total_hours < prorated_target:
                diff = prorated_target - total_hours
                if diff > grace_buffer:
                    penalty += diff * PENALTY.TARGET_HOURS_HARD
                else:
                    # Square the difference to make the penalties higher the further from the target they are.
                    penalty += (diff ** 2) * PENALTY.TARGET_HOURS_SOFT
            elif total_hours > prorated_target:
                diff = total_hours - prorated_target
                if diff > grace_buffer:
                    penalty += diff * PENALTY.TARGET_HOURS_HARD
                else:
                    # Square the difference to make the penalties higher the further from the target they are.
                    penalty += (diff ** 2) * PENALTY.TARGET_HOURS_SOFT

        # Evaluate engagement penalties
        effective_max_days_off = self.max_days_off

        if target_weekly is not None and target_weekly > 0:
            monthly_target = target_weekly * (available_days / 7.0)
            expected_shifts = monthly_target / 12.0
            if expected_shifts > 0:
                natural_gap = available_days / expected_shifts
                effective_max_days_off = max(effective_max_days_off, int(natural_gap * 1.5))

        if 0 < effective_max_days_off < self.n_days:
            active_mask = person_duty_days | (self.conflict_matrix[p] == 1)
            active_days = np.where(active_mask)[0]

            if len(active_days) > 0:
                padded_active = np.insert(active_days, 0, -1)
                padded_active = np.append(padded_active, self.n_days)
                gaps = np.diff(padded_active) - 1

                for gap in gaps:
                    if gap > effective_max_days_off:
                        penalty += get_exponential_gap_penalty(gap, effective_max_days_off)


        # Fair Utilization (Anti-Benchwarmer)
        # Add penalty if a qualified and available person isn't schedule for any shifts.
        if available_days > 0 and total_hours == 0:
            penalty += PENALTY.UTILIZATION_BENCHED

        return penalty