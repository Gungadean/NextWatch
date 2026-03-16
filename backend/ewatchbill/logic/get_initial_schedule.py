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
        for w in range(self.num_people):
            for d in range(self.num_days):
                for s in range(self.num_watchstations):
                    self.schedule_vars[(w, d, s)] = self.model.NewBoolVar(
                        f"person_{w}_day_{d}_station_{s}"
                    )

    def get_initial_schedule(self) -> np.ndarray:
        self.exact_headcount_constraint()
        self.no_two_watchstations_at_same_time_constraint()

        # TODO: Add setting to respect this constraint or not
        if len(self.frozen_shifts) == 0:
            self.min_days_off_between_duty_constraint()

        self.watchstander_qualified_constraint()
        self.no_duty_on_conflicts_constraint()
        self.frozen_assignments_constraint()

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
        Fills the exact number of required slots based on the dynamic headcount matrix.
        Handles days when a shift requires 2 people, or 0 people (e.g. weekends).
        """
        for d in range(self.num_days):
            for s in range(self.num_watchstations):
                required_headcount = int(self.headcount_matrix[d, s])
                self.model.Add(
                    sum(self.schedule_vars[(w, d, s)] for w in range(self.num_people)) == required_headcount
                )


    def one_shift_per_day_constraint(
        self,
    ):
        """
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


    def no_two_watchstations_at_same_time_constraint(
        self,
    ):
        """
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
        No more than one duty day every x days
        """
        if self.min_days_off_between_duty <= 0:
            return

        for w in range(self.num_people):
            for d in range(self.num_days):
                worked_on_day_d = self.model.NewBoolVar(f"worked_{w}_day_{d}")

                shifts_worked_today = sum(self.schedule_vars[(w, d, s)] for s in range(self.num_watchstations))

                self.model.Add(shifts_worked_today > 0).OnlyEnforceIf(worked_on_day_d)
                self.model.Add(shifts_worked_today == 0).OnlyEnforceIf(worked_on_day_d.Not())

                # Force days off
                for off_day in range(d + 1, min(d + self.min_days_off_between_duty + 1, self.num_days)):
                    for s in range(self.num_watchstations):
                        self.model.AddImplication(worked_on_day_d, self.schedule_vars[(w, off_day, s)].Not())

    def watchstander_qualified_constraint(
        self,
    ):
        """
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
        Do not overwrite the provided "frozen" assignments
        """
        for w, d, s in self.frozen_shifts:
            # Check the bounds to make sure their good
            if w < self.num_people and d < self.num_days and s < self.num_watchstations:
                self.model.Add(self.schedule_vars[(w, d, s)] == 1)