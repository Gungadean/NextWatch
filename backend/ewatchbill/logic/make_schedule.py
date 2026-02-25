#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon

import numpy as np

from .constraints import is_legal
from .get_initial_schedule import OrOptimizer
from .objectives import badness_standard_deviation_objective
from .simulated_annealing import AnnealingOptimizer


def make_schedule(
    num_people: int,
    num_days: int,
    num_watchstations: int,
    min_days_off_between_duty: int,
    max_steps: int,
    qualification_matrix: np.ndarray,
    conflict_matrix: np.ndarray,
    holiday_mask: np.ndarray,
    offset_matrix: np.ndarray,
):
    initial_schedule = OrOptimizer(
        num_days=num_days,
        num_people=num_people,
        min_days_off_between_duty=min_days_off_between_duty,
        num_watchstations=num_watchstations,
        qualification_matrix=qualification_matrix,
        conflict_matrix=conflict_matrix,
    ).get_initial_schedule()

    def is_legal_local(schedule: np.ndarray):
        return is_legal(
            schedule,
            min_days_off_between_duty=min_days_off_between_duty,
            qualification_matrix=qualification_matrix,
            conflict_matrix=conflict_matrix,
        )

    def objective_function_local(schedule: np.ndarray):
        return badness_standard_deviation_objective(
            schedule,
            holiday_mask=holiday_mask,
            is_legal=is_legal_local,
            offset_matrix=offset_matrix,
        )

    assert is_legal_local(initial_schedule), "Initial schedule is not legal"

    optimizer = AnnealingOptimizer(
        num_days=num_days,
        num_people=num_people,
        num_watchstations=num_watchstations,
        schedule=initial_schedule,
        is_legal=is_legal_local,
        objective_function=objective_function_local,
        max_steps=max_steps,
    )

    yield from optimizer.optimize()