#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon

from typing import Tuple, List

import numpy as np

from .exceptions.IllegalScheduleException import IllegalScheduleException
from .translator import ScheduleTranslator


def is_legal(
    schedule: np.ndarray,
    min_days_off_between_duty: int,
    qualification_matrix: np.ndarray,
    conflict_matrix: np.ndarray,
    shift_times: List[Tuple[float, float]],
    translator: ScheduleTranslator,
    frozen_assignments_matrix: list[tuple[int, int, int]] = None,
) -> Tuple[bool, List[str]]:

    # these should never be violated, so raise if they are
    if not frozen_assignments_matrix:
        frozen_assignments_matrix = []

    errors = []

    frozen_assignments_constraint(
        schedule=schedule,
        frozen_coordinates=frozen_assignments_matrix,
        translator=translator,
        errors=errors
    )

    no_two_watchstations_at_same_time_constraint(
        schedule=schedule,
        shift_times=shift_times,
        translator=translator,
        errors=errors
    )
    min_days_off_between_duty_constraint(
        schedule=schedule,
        min_days_off_between_duty=min_days_off_between_duty,
        translator=translator,
        errors=errors
    )
    watchstander_qualified_constraint(
        schedule=schedule,
        qualification_matrix=qualification_matrix,
        translator=translator,
        errors=errors
    )
    no_duty_on_conflicts_constraint(
        schedule=schedule,
        conflict_matrix=conflict_matrix,
        translator=translator,
        errors=errors
    )

    return len(errors) == 0, errors

def exact_headcount_constraint(schedule: np.ndarray, headcount_matrix: np.ndarray):
    """Ensures the schedule perfectly matches the dynamic headcount matrix."""
    assignments_per_day_station = np.sum(schedule, axis=0)
    violations = np.where(assignments_per_day_station != headcount_matrix)

    if len(violations[0]) > 0:
        day, station = violations[0][0], violations[1][0]
        person_count = assignments_per_day_station[day, station]
        required = headcount_matrix[day, station]
        raise IllegalScheduleException(
            f"Day {day}, Slot {station} has {person_count} people assigned instead of exactly {required}"
        )


def no_overlapping_shifts_constraint(
    schedule: np.ndarray,
    shift_times: List[Tuple[float, float]],
    translator: ScheduleTranslator,
    errors: List[str]
):
    """Ensures a watchstander is not assigned to two overlapping shifts."""
    n_people, n_days, n_slots = schedule.shape

    for w in range(n_people):
        # Same-day overlaps
        for d in range(n_days):
            worked_slots = np.where(schedule[w, d] == 1)[0]
            for i in range(len(worked_slots)):
                for j in range(i + 1, len(worked_slots)):
                    s1, s2 = worked_slots[i], worked_slots[j]
                    start1, end1 = shift_times[s1]
                    start2, end2 = shift_times[s2]
                    if max(start1, start2) < min(end1, end2):
                        errors.append(f"{translator.get_person(w)} has overlapping shifts on {translator.get_date(d)}.")

        # Cross-midnight overlaps
        for d in range(n_days - 1):
            worked_today = np.where(schedule[w, d] == 1)[0]
            worked_tmrw = np.where(schedule[w, d + 1] == 1)[0]
            for s1 in worked_today:
                for s2 in worked_tmrw:
                    start1, end1 = shift_times[s1]
                    start2, end2 = shift_times[s2]
                    if max(start1, start2 + 24.0) < min(end1, end2 + 24.0):
                        errors.append(f"{translator.get_person(w)} has a cross-midnight overlap between {translator.get_date(d)} and {translator.get_date(d+1)}.")


def one_shift_per_day_constraint(
    schedule: np.ndarray,
    translator: ScheduleTranslator,
    errors: List[str]
):
    # Sum along person axis (axis 0) to get counts for each day-station pair
    assignments_per_day_station = np.sum(schedule, axis=0)

    # Find any violations where the sum is not exactly 1
    violations = np.where(assignments_per_day_station != 1)

    if len(violations[0]) > 0:
        # Get the first violation
        day, station = violations[0][0], violations[1][0]
        person_count = assignments_per_day_station[day, station]

        errors.append(
            f"{translator.get_station(station)} on {translator.get_date(day)} has {person_count} people assigned instead of exactly one person."
        )


def no_two_watchstations_at_same_time_constraint(
    schedule: np.ndarray,
    shift_times: List[Tuple[float, float]],
    translator: ScheduleTranslator,
    errors: List[str]
):
    n_people, n_days, n_slots = schedule.shape

    intervals = {}
    for d in range(n_days):
        for s in range(n_slots):
            st, et = shift_times[s]
            abs_st = d * 24.0 + st
            abs_et = d * 24.0 + et
            if st >= et and not (st == 0.0 and et == 24.0):
                abs_et += 24.0
            intervals[(d, s)] = (abs_st, abs_et)

    for w in range(n_people):
        # Find all shifts assigned to this person
        assigned = np.where(schedule[w] == 1)
        assigned_shifts = list(zip(assigned[0], assigned[1]))

        for i in range(len(assigned_shifts)):
            for j in range(i + 1, len(assigned_shifts)):
                d1, s1 = assigned_shifts[i]
                d2, s2 = assigned_shifts[j]

                st1, et1 = intervals[(d1, s1)]
                st2, et2 = intervals[(d2, s2)]

                if max(st1, st2) < min(et1, et2):
                    errors.append(
                        f"{translator.get_person(w)} has overlapping shifts: {translator.get_station(s1)} on {translator.get_date(d1)} and {translator.get_station(s2)} on {translator.get_date(d2)}."
                    )


def min_days_off_between_duty_constraint(
    schedule: np.ndarray,
    min_days_off_between_duty: int,
    translator: ScheduleTranslator,
    errors: List[str]
):
    if min_days_off_between_duty == 0:
        return schedule

    # Sum across watchstation dimension to get a 2D array (person x day)
    # where True indicates the person has duty on that day
    person_duty_days = np.sum(schedule, axis=2) > 0

    n_people = person_duty_days.shape[0]

    for person in range(n_people):
        # Get indices of days where this person has duty
        duty_days = np.where(person_duty_days[person])[0]

        if len(duty_days) <= 1:  # No violations possible with 0 or 1 duty day
            continue

        # Calculate gaps between consecutive duty days
        gaps = np.diff(duty_days)

        # Mark violation if there is not at least 1 day off
        violations = np.where(gaps == 1)[0]

        if len(violations) > 0:
            # Get the first violation
            violation_idx = violations[0]
            day1 = duty_days[violation_idx]
            day2 = duty_days[violation_idx + 1]

            errors.append(
                f"{translator.get_person(person)} is scheduled on consecutive days ({translator.get_date(day1)} and {translator.get_date(day2)}). At least 1 day off is strictly required."
            )

def max_days_off_between_duty_constraint(
        schedule: np.ndarray,
        max_days_off_between_duty: int,
        conflict_matrix: np.ndarray
):
    if max_days_off_between_duty <= 0:
        return

    n_people, n_days, n_slots = schedule.shape

    # Flatten the 3D array into a 2D boolean array (Person x Day)
    person_duty_days = np.sum(schedule, axis=2) > 0

    for person in range(n_people):
        # Get the integer index of every day this person works
        active_mask = person_duty_days[person] | (conflict_matrix[person] == 1)
        active_days = np.where(active_mask)[0]

        # Case 1: They don't work at all
        if len(active_days) == 0:
            if n_days > max_days_off_between_duty:
                raise IllegalScheduleException(
                    f"Person {person} works 0 days, exceeding max {max_days_off_between_duty} days off.")
            continue

        # Case 2: Too many days off BEFORE their first shift
        if active_days[0] > max_days_off_between_duty:
            raise IllegalScheduleException(
                f"Person {person} has {active_days[0]} days off before their first shift, exceeding max {max_days_off_between_duty}."
            )

        # Standard Case: Look at the gaps between active shifts
        if len(active_days) > 1:
            # np.diff gets the mathematical distance between days. Subtract 1 to get the actual "days off" between them.
            gaps = np.diff(active_days) - 1
            violations = np.where(gaps > max_days_off_between_duty)[0]

            if len(violations) > 0:
                v_idx = violations[0]
                raise IllegalScheduleException(
                    f"Person {person} has {gaps[v_idx]} days off between day {active_days[v_idx]} and {active_days[v_idx + 1]}, exceeding max {max_days_off_between_duty}."
                )

        # Case 3: Too many days off after their final shift
        trailing_days_off = (n_days - 1) - active_days[-1]
        if trailing_days_off > max_days_off_between_duty:
            raise IllegalScheduleException(
                f"Person {person} has {trailing_days_off} days off at the end of the schedule, exceeding max {max_days_off_between_duty}."
            )


def watchstander_qualified_constraint(
    schedule: np.ndarray,
    qualification_matrix: np.ndarray,
    translator: ScheduleTranslator,
    errors: List[str]
):
    # Find all person-day-station assignments
    assignments = np.where(schedule == 1)

    # For each assignment, check if qualified
    persons = assignments[0]
    days = assignments[1]
    stations = assignments[2]

    # Check qualifications for all assignments at once
    quals = qualification_matrix[persons, stations]
    violations = np.where(quals != 1)[0]

    if len(violations) > 0:
        # Get first violation
        idx = violations[0]
        person, day, station = persons[idx], days[idx], stations[idx]

        errors.append(
            f"{translator.get_person(person)} is assigned to {translator.get_station(station)} on {translator.get_date(day)} but is not qualified."
        )


def no_duty_on_conflicts_constraint(
    schedule: np.ndarray,
    conflict_matrix: np.ndarray,
    translator: ScheduleTranslator,
    errors: List[str]
):
    # Sum across watchstation dimension to get person-day duty assignments
    has_duty = np.sum(schedule, axis=2) > 0

    # Find where both conflict exists and person has duty (violations)
    violations = np.where((conflict_matrix == 1) & has_duty)

    if len(violations[0]) > 0:
        # Get the first violation
        person, day = violations[0][0], violations[1][0]

        errors.append(f"{translator.get_person(person)} is assigned duty on {translator.get_date(day)} but has a conflict.")

def frozen_assignments_constraint(
    schedule: np.ndarray,
    frozen_coordinates: list[tuple[int, int, int]],
    translator: ScheduleTranslator,
    errors: List[str]
):
    """
    Ensures that any shift locked in by the user remains assigned
    to the exact same person, day, and station.
    """
    for w, d, s in frozen_coordinates:
        # If the schedule matrix at this exact 3D coordinate is 0,
        # the mutator algorithm illegally moved the shift!
        if schedule[w, d, s] == 0:
            errors.append(f"{translator.get_person(w)} was removed from {translator.get_station(s)} on {translator.get_date(d)} which is frozen.")