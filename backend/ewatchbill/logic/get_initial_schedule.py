#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#
#  Modified by Ryan Huston 2026

from dataclasses import dataclass, field
from typing import List, Tuple

import numpy as np
from ortools.sat.python import cp_model

from ewatchbill.logic.exceptions.IllegalScheduleException import IllegalScheduleException


@dataclass
class OrOptimizer:
    num_days: int
    num_people: int
    min_days_off_between_duty: int
    max_days_off_between_duty: int
    num_watchstations: int
    # people x watchstations - 1 qualified, 0 not qualified
    qualification_matrix: np.ndarray
    # people x days - 1 conflict, 0 no conflict
    conflict_matrix: np.ndarray

    # days x watchstations - 0 if not required, X for required headcount
    headcount_matrix: np.ndarray
    # list of (start_hour, end_hour) floats. e.g., (18.0, 30.0) for an 18:00 to 06:00 shift.
    shift_times: List[Tuple[float, float]]

    frozen_shifts: list = field(default_factory=list)

    model: cp_model.CpModel = field(init=False)
    schedule_vars: dict = field(init=False)

    def __post_init__(self):
        self.model = cp_model.CpModel()
        self.schedule_vars = {}
        self.penalties = []
        for w in range(self.num_people):
            for d in range(self.num_days):
                for s in range(self.num_watchstations):
                    self.schedule_vars[(w, d, s)] = self.model.NewBoolVar(
                        f"person_{w}_day_{d}_station_{s}"
                    )

    def get_initial_schedule(self) -> np.ndarray:
        self.exact_headcount_constraint()
        self.no_two_watchstations_at_same_time_constraint()

        self.min_days_off_between_duty_constraint()
        self.max_days_off_between_duty_constraint()
        self.fair_utilization_constraint()

        self.watchstander_qualified_constraint()
        self.no_duty_on_conflicts_constraint()
        self.frozen_assignments_constraint()

        if self.penalties:
            self.model.Minimize(sum(self.penalties))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30
        status = solver.Solve(self.model)

        if status == cp_model.INFEASIBLE:
            raise IllegalScheduleException("Unable to meet constraints. Try adjusting constraint requirements or adjust the dates.")
        elif status == cp_model.UNKNOWN:
            raise IllegalScheduleException("Solver Timeout: The math engine could not find a solution in 30 seconds.")
        elif status == cp_model.MODEL_INVALID:
            raise IllegalScheduleException("Solver Error: The internal constraint model is mathematically invalid.")
        elif status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            raise IllegalScheduleException(f"Solver failed with unknown status code: {status}")

        schedule = np.zeros(
            (self.num_people, self.num_days, self.num_watchstations), dtype=int
        )

        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            for w in range(self.num_people):
                for d in range(self.num_days):
                    for s in range(self.num_watchstations):
                        if solver.Value(self.schedule_vars[(w, d, s)]) == 1:
                            schedule[w, d, s] = 1

        return schedule


    def exact_headcount_constraint(self):
        """
        Soft Constraint
        Fills the exact number of required slots based on the dynamic headcount matrix.
        Handles days when a shift requires 2 people, or 0 people (e.g. weekends).
        """
        for d in range(self.num_days):
            for s in range(self.num_watchstations):
                required_headcount = int(self.headcount_matrix[d, s])

                if required_headcount > 0:
                    assigned_people = sum(self.schedule_vars[(w, d, s)] for w in range(self.num_people))

                    missing_vars = [self.model.NewBoolVar(f"missing_d{d}_s{s}_chair{i}") for i in
                                    range(required_headcount)]

                    self.model.Add(assigned_people + sum(missing_vars) == required_headcount)

                    # Applied tier penalties based on the number of missing people. The index represents the number
                    # of people assigned to the role of what should have been. 0 means the role could not be filled.
                    for i, missing_var in enumerate(missing_vars):
                        if i == 0:
                            self.penalties.append(missing_var * 100000)
                        elif i == 1:
                            self.penalties.append(missing_var * 10000)
                        else:
                            self.penalties.append(missing_var * 1000)
                else:
                    # If the shift isn't required that day, enforce 0
                    self.model.Add(sum(self.schedule_vars[(w, d, s)] for w in range(self.num_people)) == 0)


    def one_shift_per_day_constraint(
        self,
    ):
        """
        Hard Constraint
        Exactly one shift per day per watchstation
        """
        for d in range(self.num_days):
            for s in range(self.num_watchstations):
                self.model.Add(
                    sum(
                        self.schedule_vars[(w, d, s)]
                        for w in range(self.num_people)
                    )
                    == 1
                )

    def fair_utilization_constraint(self):
        """
        SOFT CONSTRAINT: Penalizes the solver if a qualified person is assigned 0 shifts.
        Ensures the workload is distributed rather than dumped on a few people.
        """
        for w in range(self.num_people):
            # Only apply this if the person is actually qualified for at least one station
            if sum(self.qualification_matrix[w]) > 0:
                total_shifts = sum(
                    self.schedule_vars[(w, d, s)]
                    for d in range(self.num_days)
                    for s in range(self.num_watchstations)
                )

                is_benched = self.model.NewBoolVar(f"is_benched_w{w}")

                # If total_shifts == 0, then is_benched MUST be 1
                self.model.Add(total_shifts == 0).OnlyEnforceIf(is_benched)
                self.model.Add(total_shifts > 0).OnlyEnforceIf(is_benched.Not())

                # Apply a moderate penalty (5000 points)
                # This ensures the solver will prefer to spread shifts out,
                # but won't break a critical rule just to give someone a shift.
                self.penalties.append(is_benched * 5000)


    def no_two_watchstations_at_same_time_constraint(
        self,
    ):
        """
        Hard Constraint
        One watchstander can't be on two watchstations at the same time
        """
        intervals = {}
        for d in range(self.num_days):
            for s in range(self.num_watchstations):
                st, et = self.shift_times[s]
                abs_st = d * 24.0 + st
                abs_et = d * 24.0 + et

                # If end time is earlier than start time, it wraps into tomorrow!
                if st >= et and not (st == 0.0 and et == 24.0):
                    abs_et += 24.0

                intervals[(d, s)] = (abs_st, abs_et)

        # Check every possible combination of shifts for overlap
        for w in range(self.num_people):
            shifts = [(d, s) for d in range(self.num_days) for s in range(self.num_watchstations)]
            for i in range(len(shifts)):
                for j in range(i + 1, len(shifts)):
                    d1, s1 = shifts[i]
                    d2, s2 = shifts[j]

                    st1, et1 = intervals[(d1, s1)]
                    st2, et2 = intervals[(d2, s2)]

                    if max(st1, st2) < min(et1, et2):
                        self.model.Add(self.schedule_vars[(w, d1, s1)] + self.schedule_vars[(w, d2, s2)] <= 1)


    def min_days_off_between_duty_constraint(
        self,
    ):
        """
        Soft Constraint
        No more than one duty day every x days.
        """
        if self.min_days_off_between_duty <= 0:
            return

        intervals = {}
        for d in range(self.num_days):
            for s in range(self.num_watchstations):
                st, et = self.shift_times[s]
                abs_st = d * 24.0 + st
                abs_et = d * 24.0 + et
                # If end time is earlier than start time, it wrapped past midnight into tomorrow
                if st >= et and not (st == 0.0 and et == 24.0):
                    abs_et += 24.0
                intervals[(d, s)] = (abs_st, abs_et)

        for w in range(self.num_people):
            for d in range(self.num_days):
                for s1 in range(self.num_watchstations):
                    for off_day in range(d + 1, min(d + self.min_days_off_between_duty + 1, self.num_days)):
                        for s2 in range(self.num_watchstations):

                            violation = self.model.NewIntVar(0, 1, f"min_viol_w{w}_d{d}_s{s1}_od{off_day}_s{s2}")

                            # Evaluate if the person is working both s1 and s2, violation must be 1.
                            self.model.Add(
                                self.schedule_vars[(w, d, s1)] + self.schedule_vars[(w, off_day, s2)] <= 1 + violation)

                            if off_day == d + 1:
                                # They are working consecutive days. Calculate actual rest hours.
                                _, end1 = intervals[(d, s1)]
                                start2, _ = intervals[(off_day, s2)]
                                rest_hours = start2 - end1

                                if rest_hours <= 0:
                                    # This is a critical safety violation.
                                    # Back to back shifts with no break in between.
                                    self.penalties.append(violation * 500000)
                                else:
                                    # Violates the calendar preference, but is physically safe.
                                    # At least 12hrs between shifts.
                                    self.penalties.append(violation * 10000)
                            else:
                                # Normal penalty for subtracting a day from min days off (gap > 1)
                                self.penalties.append(violation * 500)


    def max_days_off_between_duty_constraint(self):
        """
        Soft Constraint
        Ensures a person works at least one shift within any sliding window
        of (max_days_off + 1) days, ignoring approved time off
        """
        if self.max_days_off_between_duty <= 0 or self.max_days_off_between_duty >= self.num_days:
            return

        for w in range(self.num_people):
            # Evaluate windows of increasing size to create an exponentially stacking penalty
            for extra_days in range(1, self.num_days - self.max_days_off_between_duty + 1):
                window_size = self.max_days_off_between_duty + extra_days

                penalty_weight = int(10 * (2 ** (extra_days - 1)))

                # Cap at 50,000 to prevent integer overflow on massive date ranges
                if penalty_weight > 50000:
                    penalty_weight = 50000

                for start_d in range(self.num_days - window_size + 1):
                    conflicts_in_window = sum(self.conflict_matrix[w, start_d: start_d + window_size])

                    # Only enforce the rule if the window consists purely of available days
                    if conflicts_in_window == 0:
                        shifts_in_window = [
                            self.schedule_vars[(w, d, s)]
                            for d in range(start_d, start_d + window_size)
                            for s in range(self.num_watchstations)
                        ]
                        violation = self.model.NewIntVar(0, 1, f"max_viol_w{w}_start{start_d}_len{window_size}")
                        self.model.Add(sum(shifts_in_window) + violation >= 1)
                        self.penalties.append(violation * penalty_weight)


    def watchstander_qualified_constraint(
        self,
    ):
        """
        Hard Constraint
        Watchstander must be qualified
        """
        for w in range(self.num_people):
            for s in range(self.num_watchstations):
                if self.qualification_matrix[w, s] == 0:
                    self.model.Add(
                        sum(
                            self.schedule_vars[(w, d, s)]
                            for d in range(self.num_days)
                        )
                        == 0
                    )

    def no_duty_on_conflicts_constraint(
        self,
    ):
        """
        Hard Constraint
        No duty on conflicts
        """
        for w in range(self.num_people):
            for d in range(self.num_days):
                if self.conflict_matrix[w, d] == 1:
                    self.model.Add(
                        sum(
                            self.schedule_vars[(w, d, s)]
                            for s in range(self.num_watchstations)
                        )
                        == 0
                    )


    def frozen_assignments_constraint(
        self,
    ):
        """
        Hard Constraint
        Do not overwrite the provided "frozen" assignments
        """
        for w, d, s in self.frozen_shifts:
            # Check the bounds to make sure their good
            if w < self.num_people and d < self.num_days and s < self.num_watchstations:
                self.model.Add(self.schedule_vars[(w, d, s)] == 1)