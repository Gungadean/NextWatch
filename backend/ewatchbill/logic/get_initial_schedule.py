#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#
#  Modified by Ryan Huston 2026

import multiprocessing
from dataclasses import dataclass, field
from typing import List, Tuple, Any

import numpy as np
from ortools.sat.python import cp_model

from ewatchbill.logic.exceptions.IllegalScheduleException import IllegalScheduleException
from ewatchbill.logic.objectives import PENALTY


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
    translator: Any = None

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

        self.max_shift_length_constraint()
        self.consecutive_days_constraint()
        self.target_hours_constraint()
        self.shift_switch_constraint()
        self.fragmentation_constraint()

        if self.penalties:
            self.model.Minimize(sum(self.penalties))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30
        solver.parameters.num_workers = multiprocessing.cpu_count()

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

    def target_hours_constraint(self):
        """Softly guides the initial solver to balance hours evenly or hit strict targets."""
        if not self.translator:
            return

        generic_weekly_target = 40.0

        for w in range(self.num_people):
            ws_obj = self.translator.watchstanders[w]
            target_weekly = ws_obj.get('target_weekly_hours') if isinstance(ws_obj, dict) else getattr(ws_obj,
                                                                                                       'target_weekly_hours',
                                                                                                       None)

            conflict_days = np.sum(self.conflict_matrix[w])
            available_days = max(0, self.num_days - conflict_days)

            base_target = target_weekly if target_weekly is not None else generic_weekly_target
            prorated_target = base_target * (available_days / 7.0)

            target_int = int(prorated_target * 10)

            total_hours_expr = 0
            for d in range(self.num_days):
                for s in range(self.num_watchstations):
                    st, et = self.shift_times[s]
                    dur = et - st if et > st else (et + 24.0) - st
                    if dur == 0: dur = 24.0

                    total_hours_expr += self.schedule_vars[(w, d, s)] * int(dur * 10)

            diff = self.model.NewIntVar(0, 100000, f"hours_diff_w{w}")

            self.model.Add(diff >= total_hours_expr - target_int)
            self.model.Add(diff >= target_int - total_hours_expr)

            weight = PENALTY.TARGET_HOURS_HARD if target_weekly is not None else PENALTY.TARGET_HOURS_SOFT * 10
            self.penalties.append(diff * weight)

    def consecutive_days_constraint(self):
        """
        Hard limits the max consecutive days, and strictly enforces minimum consecutive blocks.
        By enforcing this as a Hard Constraint, we guarantee the Simulated Annealer starts
        with perfectly formed blocks and will naturally refuse to break them.
        """
        if not self.translator:
            return

        for w in range(self.num_people):
            ws_obj = self.translator.watchstanders[w]
            max_consec = ws_obj.get('max_consecutive_days') if isinstance(ws_obj, dict) else getattr(ws_obj,
                                                                                                     'max_consecutive_days',
                                                                                                     None)
            min_consec = ws_obj.get('min_consecutive_days') if isinstance(ws_obj, dict) else getattr(ws_obj,
                                                                                                     'min_consecutive_days',
                                                                                                     None)

            worked_day_vars = []

            # Condense multiple possible shifts per day into a single "worked today" boolean
            for d in range(self.num_days):
                worked_today = self.model.NewBoolVar(f"worked_w{w}_d{d}")
                shifts_today = [self.schedule_vars[(w, d, s)] for s in range(self.num_watchstations)]
                if shifts_today:
                    self.model.AddMaxEquality(worked_today, shifts_today)
                else:
                    self.model.Add(worked_today == 0)
                worked_day_vars.append(worked_today)

            # --- MAX CONSECUTIVE CONSTRAINT (Hard) ---
            if max_consec:
                # Slide a window across the schedule to block anything exceeding max_consec
                for start_d in range(self.num_days - max_consec):
                    window = worked_day_vars[start_d: start_d + max_consec + 1]
                    self.model.Add(sum(window) <= max_consec)

            # --- MIN CONSECUTIVE CONSTRAINT (Hard) ---
            if min_consec and min_consec > 1:
                for d in range(self.num_days):
                    # Define what it means to "Start" a block of shifts
                    is_start = self.model.NewBoolVar(f"start_w{w}_d{d}")

                    if d == 0:
                        # Day 0 is a start if they work Day 0
                        self.model.Add(is_start == worked_day_vars[d])
                    else:
                        # A start happens IF they work today AND did not work yesterday
                        self.model.AddImplication(is_start, worked_day_vars[d])
                        self.model.AddImplication(is_start, worked_day_vars[d - 1].Not())
                        # Tie the logic together: if worked today and not yesterday, is_start MUST be true
                        self.model.AddBoolOr([worked_day_vars[d].Not(), worked_day_vars[d - 1], is_start])

                    # If today is a start day, mathematically force the next (min_consec - 1) days to be worked
                    for offset in range(1, min_consec):
                        target_day = d + offset
                        if target_day < self.num_days:
                            self.model.AddImplication(is_start, worked_day_vars[target_day])

    def max_shift_length_constraint(self):
        """
        Hard Constraint
        Prevents OR-Tools from building an initial schedule that physically
        overworks an employee beyond their maximum daily limit.
        """
        if not self.translator:
            return

        for w in range(self.num_people):
            ws_obj = self.translator.watchstanders[w]
            max_len = ws_obj.get('max_shift_length') if isinstance(ws_obj, dict) else getattr(ws_obj, 'max_shift_length', None)

            if max_len is None:
                continue

            for d in range(self.num_days):
                day_duration_expr = 0
                for s in range(self.num_watchstations):
                    st, et = self.shift_times[s]
                    dur = et - st if et > st else (et + 24.0) - st
                    if dur == 0: dur = 24.0

                    # Convert to integer (multiply by 10) to safely handle half-hours in CP-SAT math
                    dur_int = int(dur * 10)
                    day_duration_expr += self.schedule_vars[(w, d, s)] * dur_int

                # Model strictly blocks anyone exceeding their personal cap
                self.model.Add(day_duration_expr <= int(max_len * 10))


    def shift_switch_constraint(self):
        """
        Soft Constraint
        Discourages the initial solver from flipping a person's routine (e.g. Day to Night)
        on back-to-back calendar days.
        """
        if not self.translator:
            return

        for w in range(self.num_people):
            for d in range(self.num_days - 1):
                for s1 in range(self.num_watchstations):
                    for s2 in range(self.num_watchstations):
                        if s1 == s2:
                            continue

                        st1 = self.shift_times[s1][0]
                        st2 = self.shift_times[s2][0]

                        if st1 != st2:
                            # Create a boolean that triggers if this specific flip occurs
                            switch_var = self.model.NewBoolVar(f"switch_w{w}_d{d}_s{s1}_s{s2}")

                            # If person works s1 on 'd', and s2 on 'd+1', switch_var must be true
                            self.model.AddBoolOr([
                                self.schedule_vars[(w, d, s1)].Not(),
                                self.schedule_vars[(w, d + 1, s2)].Not(),
                                switch_var
                            ])

                            # Penalize the solver for making this choice
                            self.penalties.append(switch_var * PENALTY.FATIGUE_SHIFT_SWITCH)

    def fragmentation_constraint(self):
        """
        Soft Constraint
        Discourages 24hr-capable workers from taking fragmented 12-hour shifts.
        Ensures military preferentially grab 24h blocks, leaving 12h shifts to contractors.
        """
        if not self.translator: return

        for w in range(self.num_people):
            ws_obj = self.translator.watchstanders[w]
            max_len = ws_obj.get('max_shift_length') if isinstance(ws_obj, dict) else getattr(ws_obj,
                                                                                              'max_shift_length', None)

            # Identify Unrestricted Workers
            capable_of_24 = (max_len is None or max_len >= 24.0)
            if not capable_of_24:
                continue

            for d in range(self.num_days):
                worked_today = self.model.NewBoolVar(f"worked_w{w}_d{d}")
                shifts_today = [self.schedule_vars[(w, d, s)] for s in range(self.num_watchstations)]
                if shifts_today:
                    self.model.AddMaxEquality(worked_today, shifts_today)
                else:
                    self.model.Add(worked_today == 0)

                # Calculate total hours worked today
                day_duration_expr = 0
                for s in range(self.num_watchstations):
                    st, et = self.shift_times[s]
                    dur = et - st if et > st else (et + 24.0) - st
                    if dur == 0: dur = 24.0
                    day_duration_expr += self.schedule_vars[(w, d, s)] * int(dur * 10)

                is_fragmented = self.model.NewBoolVar(f"frag_w{w}_d{d}")

                # If worked_today == 1 AND duration < 240 (24 hours), is_fragmented must be 1.
                self.model.Add(day_duration_expr + (is_fragmented * 240) >= 240 * worked_today)

                self.penalties.append(is_fragmented * PENALTY.SCHEDULING_FRAGMENTATION)


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
                            self.penalties.append(missing_var * PENALTY.HEADCOUNT_MISSING_1)
                        elif i == 1:
                            self.penalties.append(missing_var * PENALTY.HEADCOUNT_MISSING_2)
                        else:
                            self.penalties.append(missing_var * PENALTY.HEADCOUNT_MISSING_3)
                else:
                    # If the shift isn't required that day, enforce 0
                    self.model.Add(sum(self.schedule_vars[(w, d, s)] for w in range(self.num_people)) == 0)

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

                self.penalties.append(is_benched * PENALTY.UTILIZATION_BENCHED)


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
            ws_obj = self.translator.watchstanders[w] if self.translator else {}
            min_consec = ws_obj.get('min_consecutive_days') if isinstance(ws_obj, dict) else getattr(ws_obj,
                                                                                                     'min_consecutive_days',
                                                                                                     None)
            min_consec = min_consec or 1

            if min_consec > 1:
                continue

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
                                    self.penalties.append(violation * PENALTY.FATIGUE_CRITICAL_REST)
                                else:
                                    self.penalties.append(violation * PENALTY.FATIGUE_MIN_DAYS_OFF)
                            else:
                                self.penalties.append(violation * PENALTY.FATIGUE_MIN_DAYS_OFF)


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

                # Cap at 5,000,000 to prevent integer overflow on massive date ranges
                penalty_weight = int(PENALTY.TARGET_MAX_DAYS_OFF * (2 ** (extra_days - 1)))
                if penalty_weight > 5000000:
                    penalty_weight = 5000000

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