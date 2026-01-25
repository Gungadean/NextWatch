#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#  Modified by Ryan Huston. 2026

from dataclasses import dataclass, field
from typing import Callable

import numpy as np


@dataclass
class AnnealingOptimizer:
    num_days: int
    num_people: int
    num_watchstations: int
    # people x days x watchstations
    schedule: np.ndarray
    schedule_score: float = field(init=False)
    is_legal: Callable[[np.ndarray], bool]
    objective_function: Callable[[np.ndarray], float]
    max_steps: int
    best_schedule: np.ndarray = field(init=False)
    best_schedule_score: float = field(init=False)
    temperature: float = 1

    def __post_init__(self):
        self.best_schedule = self.schedule.copy()
        self.best_schedule_score = self.objective_function(self.schedule)
        self.schedule_score = self.objective_function(self.schedule)

    @property
    def cooling_rate(self) -> float:
        min_temp = 0.05
        return min_temp ** (1 / self.max_steps)

    def optimize(self):
        for _ in range(self.max_steps):
            yield self.schedule, self.schedule_score, self.is_legal(
                self.schedule
            )
            if self.schedule_score == 0:
                return
            self.step()
        yield self.best_schedule, self.best_schedule_score, self.is_legal(
            self.best_schedule
        )

    def step(self):
        self.temperature *= self.cooling_rate
        new_schedule = self.perturb_schedule()
        new_schedule_score = self.objective_function(new_schedule)
        if new_schedule_score < self.schedule_score:
            self.schedule = new_schedule
            self.schedule_score = new_schedule_score
            if (
                self.is_legal(new_schedule)
                and new_schedule_score < self.best_schedule_score
            ):
                self.best_schedule = new_schedule
                self.best_schedule_score = new_schedule_score
        move_probability = np.exp(
            (self.schedule_score - new_schedule_score) / self.temperature
        )
        if np.random.rand() < move_probability:
            self.schedule = new_schedule
            self.schedule_score = new_schedule_score

    def perturb_schedule(self) -> np.ndarray:
        perturbation_functions = [
            self.perturb_schedule_swap_person,
            self.perturb_schedule_change_watchstation,
            self.perturb_schedule_swap_watchstander_day,
            self.perturb_schedule_move_day,
        ]
        perturbation_function = np.random.choice(perturbation_functions, 1)[0]
        return perturbation_function(self.schedule.copy())

    def perturb_schedule_swap_person(self, schedule: np.ndarray) -> np.ndarray:
        """
        Swap one person for another
        """
        person = np.random.randint(0, self.num_people)
        # find a day and watchstation where the person is assigned
        # in other words, find a 1 in the schedule
        indices = np.argwhere(schedule[person, :, :] == 1)
        if len(indices) == 0:
            return schedule
        day, watchstation = indices[np.random.randint(0, len(indices))]

        def person_can_swap(candidate: int, day: int) -> bool:
            if np.sum(schedule[candidate, day, :]) > 0:
                return False
            if person == candidate:
                return False
            return True

        candidates = [
            i for i in range(self.num_people) if person_can_swap(i, day)
        ]
        if len(candidates) == 0:
            return schedule
        other_person = np.random.choice(candidates, 1)[0]
        schedule[person, day, watchstation] = 0
        schedule[other_person, day, watchstation] = 1
        return schedule

    def perturb_schedule_change_watchstation(
        self, schedule: np.ndarray
    ) -> np.ndarray:
        """
        Change the watchstation of one person
        """
        person = np.random.randint(0, self.num_people)
        # find a day and watchstation where the person is assigned
        # in other words, find a 1 in the schedule
        indices = np.argwhere(schedule[person, :, :] == 1)
        if len(indices) == 0:
            return schedule
        day, watchstation = indices[np.random.randint(0, len(indices))]
        # choose another watchstation
        other_watchstation = np.random.randint(0, self.num_watchstations)
        # get the person on the other watchstation
        other_person = np.argwhere(schedule[:, day, other_watchstation] == 1)
        assert len(other_person) == 1, (
            "Not exactly one person on watchstation"
            f"{other_watchstation} on day {day}"
        )
        other_person = other_person[0]

        schedule[person, day, watchstation] = 0
        schedule[person, day, other_watchstation] = 1
        schedule[other_person, day, other_watchstation] = 0
        schedule[other_person, day, watchstation] = 1
        return schedule

    def perturb_schedule_swap_watchstander_day(
        self, schedule: np.ndarray
    ) -> np.ndarray:
        """
        Swap one person's watch one day with another day
        """
        day_1 = np.random.randint(0, self.num_days)
        day_2 = np.random.randint(0, self.num_days)
        if day_1 == day_2:
            return schedule
        watchstation = np.random.randint(0, self.num_watchstations)
        person_1 = np.argwhere(schedule[:, day_1, watchstation] == 1)[0]
        person_2 = np.argwhere(schedule[:, day_2, watchstation] == 1)[0]
        if person_1 == person_2:
            # same person, no swap needed
            return schedule
        if np.sum(schedule[person_1, day_2, :]) > 0:
            # person_1 is already assigned on day_2
            return schedule
        if np.sum(schedule[person_2, day_1, :]) > 0:
            # person_2 is already assigned on day_1
            return schedule
        schedule[person_1, day_1, watchstation] = 0
        schedule[person_2, day_2, watchstation] = 0
        schedule[person_1, day_2, watchstation] = 1
        schedule[person_2, day_1, watchstation] = 1
        return schedule

    def perturb_schedule_move_day(self, schedule: np.ndarray) -> np.ndarray:
        """
        Move one whole day and shift the rest of the schedule
        """
        day = np.random.randint(0, self.num_days)
        new_position = np.random.randint(0, self.num_days)
        if new_position == day:
            return schedule
        day_data = schedule[:, day, :]
        schedule = np.delete(schedule, day, axis=1)
        schedule = np.insert(schedule, new_position, day_data, axis=1)
        return schedule