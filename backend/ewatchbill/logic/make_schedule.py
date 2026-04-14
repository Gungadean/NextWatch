#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#
#  Modified by Ryan Huston 2026

import numpy as np

from .constraints import is_legal
from .exceptions.IllegalScheduleException import IllegalScheduleException
from .get_initial_schedule import OrOptimizer
from .objectives import DeltaScorer
from .simulated_annealing import AnnealingOptimizer
from .translator import ScheduleTranslator


def make_schedule(
    num_people: int,
    num_days: int,
    num_watchstations: int,
    min_days_off_between_duty: int,
    max_days_off_between_duty: int,
    max_steps: int,
    qualification_matrix: np.ndarray,
    conflict_matrix: np.ndarray,
    holiday_mask: np.ndarray,
    offset_matrix: np.ndarray,
    translator: ScheduleTranslator,
    headcount_matrix: np.ndarray = None,
    shift_times: list = None,
    frozen_assignments_matrix: list = None
):
    if frozen_assignments_matrix is None:
        frozen_assignments_matrix = []

    initial_schedule = OrOptimizer(
        num_days=num_days,
        num_people=num_people,
        min_days_off_between_duty=min_days_off_between_duty,
        max_days_off_between_duty=max_days_off_between_duty,
        num_watchstations=num_watchstations,
        qualification_matrix=qualification_matrix,
        conflict_matrix=conflict_matrix,
        headcount_matrix=headcount_matrix,
        shift_times=shift_times,
        frozen_shifts=frozen_assignments_matrix
    ).get_initial_schedule()

    def is_legal_local(schedule: np.ndarray):
        is_legal_bool, _ = is_legal(
            schedule,
            min_days_off_between_duty=min_days_off_between_duty,
            qualification_matrix=qualification_matrix,
            conflict_matrix=conflict_matrix,
            shift_times=shift_times,
            translator=translator,
            frozen_assignments_matrix=frozen_assignments_matrix
        )
        return is_legal_bool


    def objective_function_local(schedule: np.ndarray):
        return DeltaScorer(
            schedule,
            holiday_mask=holiday_mask,
            offset_matrix=offset_matrix,
            min_days_off=min_days_off_between_duty,
            max_days_off=max_days_off_between_duty,
            headcount_matrix=headcount_matrix,
            conflict_matrix=conflict_matrix,
            qualification_matrix=qualification_matrix,
            shift_times=shift_times
        )


    initial_is_legal, error_message = is_legal(
        initial_schedule,
        min_days_off_between_duty=min_days_off_between_duty,
        qualification_matrix=qualification_matrix,
        conflict_matrix=conflict_matrix,
        shift_times=shift_times,
        translator=translator,
        frozen_assignments_matrix=frozen_assignments_matrix
    )

    if not initial_is_legal:
        raise IllegalScheduleException(f"Constraint failure: {error_message}")

    optimizer = AnnealingOptimizer(
        num_days=num_days,
        num_people=num_people,
        num_watchstations=num_watchstations,
        schedule=initial_schedule,
        is_legal=is_legal_local,
        objective_function=objective_function_local,
        max_steps=max_steps,
        frozen_coordinates=frozen_assignments_matrix,
    )

    yield from optimizer.optimize()