#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon

import numpy as np

from .exceptions.IllegalScheduleException import IllegalScheduleException


def is_legal(
    schedule: np.ndarray,
    min_days_off_between_duty: int,
    qualification_matrix: np.ndarray,
    conflict_matrix: np.ndarray,
) -> bool:
    # these should never be violated, so raise if they are
    one_shift_per_day_constraint(schedule)
    no_two_watchstations_at_same_time_constraint(schedule)
    # these might be, but should be penalized
    try:
        min_days_off_between_duty_constraint(
            schedule, min_days_off_between_duty=min_days_off_between_duty
        )
        watchstander_qualified_constraint(
            schedule,
            qualification_matrix=qualification_matrix,
        )
        no_duty_on_conflicts_constraint(
            schedule,
            conflict_matrix=conflict_matrix,
        )
    except IllegalScheduleException:
        return False
    return True


def one_shift_per_day_constraint(
    schedule: np.ndarray,
):
    # Sum along person axis (axis 0) to get counts for each day-station pair
    assignments_per_day_station = np.sum(schedule, axis=0)

    # Find any violations where the sum is not exactly 1
    violations = np.where(assignments_per_day_station != 1)

    if len(violations[0]) > 0:
        # Get the first violation
        day, station = violations[0][0], violations[1][0]
        person_count = assignments_per_day_station[day, station]

        raise IllegalScheduleException(
            f"Day {day}, Station {station} has {person_count} people assigned "
            f"instead of exactly one person"
        )


def no_two_watchstations_at_same_time_constraint(
    schedule: np.ndarray,
):
    assignments_per_person_day = np.sum(schedule, axis=2)
    violations = np.where(assignments_per_person_day > 1)
    if len(violations[0]) > 0:
        person, day = violations[0][0], violations[1][0]
        raise IllegalScheduleException(
            f"Person {person} is assigned to multiple "
            f"watchstations on day {day}"
        )


def min_days_off_between_duty_constraint(
    schedule: np.ndarray,
    min_days_off_between_duty: int,
):
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

        # Find violations where gaps are too small
        violations = np.where(gaps <= min_days_off_between_duty)[0]

        if len(violations) > 0:
            # Get the first violation
            violation_idx = violations[0]
            day1 = duty_days[violation_idx]
            day2 = duty_days[violation_idx + 1]

            raise IllegalScheduleException(
                f"Person {person} has duty on day {day1} and "
                f"should have at least {min_days_off_between_duty}"
                f" days off before next duty on day {day2}"
            )


def watchstander_qualified_constraint(
    schedule: np.ndarray,
    qualification_matrix: np.ndarray,
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

        raise IllegalScheduleException(
            f"Person {person} is assigned to station "
            f"{station} on day {day} but is not qualified"
        )


def no_duty_on_conflicts_constraint(
    schedule: np.ndarray,
    conflict_matrix: np.ndarray,
):
    # Sum across watchstation dimension to get person-day duty assignments
    has_duty = np.sum(schedule, axis=2) > 0

    # Find where both conflict exists and person has duty (violations)
    violations = np.where((conflict_matrix == 1) & has_duty)

    if len(violations[0]) > 0:
        # Get the first violation
        person, day = violations[0][0], violations[1][0]

        raise IllegalScheduleException(
            f"Person {person} is assigned duty on day {day} "
            "but has a conflict"
        )