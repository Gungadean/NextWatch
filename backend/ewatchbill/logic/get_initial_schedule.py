#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#
#  Modified by Ryan Huston 2026

from dataclasses import dataclass, field

import numpy as np
from ortools.sat.python import cp_model


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
        self.one_shift_per_day_constraint()
        self.no_two_watchstations_at_same_time_constraint()
        self.min_days_off_between_duty_constraint()
        self.watchstander_qualified_constraint()
        self.no_duty_on_conflicts_constraint()
        self.frozen_assignments_constraint()

        solver = cp_model.CpSolver()
        solver.Solve(self.model)
        schedule = np.zeros(
            (self.num_people, self.num_days, self.num_watchstations), dtype=int
        )
        for w in range(self.num_people):
            for d in range(self.num_days):
                for s in range(self.num_watchstations):
                    if solver.Value(self.schedule_vars[(w, d, s)]) == 1:
                        schedule[w, d, s] = 1
        return schedule

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
        for w in range(self.num_people):
            for d in range(self.num_days):
                self.model.Add(
                    sum(
                        self.schedule_vars[(w, d, s)]
                        for s in range(self.num_watchstations)
                    )
                    <= 1
                )

    def min_days_off_between_duty_constraint(
        self,
    ):
        """
        No more than one duty day every x days
        """
        for w in range(self.num_people):
            for d in range(self.num_days):
                self.model.Add(
                    sum(
                        self.schedule_vars[(w, day, s)]
                        for s in range(self.num_watchstations)
                        for day in range(
                            d,
                            min(
                                d + self.min_days_off_between_duty + 1,
                                self.num_days,
                            ),
                        )
                    )
                    <= 1
                )

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