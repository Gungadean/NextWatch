#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#
#  Modified by Ryan Huston

from dataclasses import dataclass, field
from typing import Callable, Tuple, List

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
    frozen_coordinates: List[Tuple[int, int, int]] = field(default_factory=list)
    temperature: float = 1

    frozen_mask: np.ndarray = field(init=False)

    def __post_init__(self):
        self.best_schedule = self.schedule.copy()
        self.best_schedule_score = self.objective_function(self.schedule)
        self.schedule_score = self.objective_function(self.schedule)

        # Build mask of frozen days to optimize the annealing process
        # to not attempt to assign to these coordinates, saving cycles.
        self.frozen_mask = np.zeros_like(self.schedule)
        for w, d, s in self.frozen_coordinates:
            self.frozen_mask[w, d, s] = 1

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

        # Modify the array with data of changes
        schedule_changes = self.perturb_schedule()

        if not schedule_changes:
            return

        new_schedule_score = self.objective_function(self.schedule)

        keep_change = False

        if new_schedule_score < self.schedule_score:
            keep_change = True
            # Only copy the schedule if this is the new best score.
            if (
                self.is_legal(self.schedule)
                and new_schedule_score < self.best_schedule_score
            ):
                self.best_schedule = self.schedule.copy()
                self.best_schedule_score = new_schedule_score
        else:
            move_probability = np.exp(
                (self.schedule_score - new_schedule_score) / self.temperature
            )

            if np.random.rand() < move_probability:
                keep_change = True

        # Check if the changes should be kept or rolled back.
        if keep_change:
            self.schedule_score = new_schedule_score
        else:
            for person, day, watchstation, old_val in schedule_changes:
                self.schedule[person, day, watchstation] = old_val

    def perturb_schedule(self) -> List[Tuple[int, int, int, int]]:
        perturbation_functions = [
            self.perturb_schedule_swap_person,
            self.perturb_schedule_change_watchstation,
            self.perturb_schedule_swap_watchstander_day,
        ]
        perturbation_function = np.random.choice(perturbation_functions, 1)[0]
        return perturbation_function()

    def perturb_schedule_swap_person(self) -> List[Tuple[int, int, int, int]]:
        """
        Swap one person for another
        """
        person = np.random.randint(0, self.num_people)
        # find a day and watchstation where the person is assigned
        # in other words, find a 1 in the schedule
        indices = np.argwhere(self.schedule[person, :, :] == 1)
        if len(indices) == 0:
            return []

        day, watchstation = indices[np.random.randint(0, len(indices))]

        # Return the schedule if this specific assignment is frozen
        if self.frozen_mask[person, day, watchstation] == 1:
            return []

        # Find anyone who isn't already working this exact day
        valid_candidates = [
            i for i in range(self.num_people)
            if i != person and np.sum(self.schedule[i, day, :]) == 0
        ]

        if not valid_candidates:
            return []

        # Find candidates that don't work the day before or after.
        ideal_candidates = []
        for c in valid_candidates:
            has_prev = day > 0 and np.sum(self.schedule[c, day - 1, :]) > 0
            has_next = day < self.num_days - 1 and np.sum(self.schedule[c, day + 1, :]) > 0
            if not has_prev and not has_next:
                ideal_candidates.append(c)

        # Try to swap the ideal candidate majority of the time. Add a 10% for any valid candidate to prevent
        # the annealer from locking up, and allowing potential new paths to explore.
        if ideal_candidates and np.random.rand() < 0.90:
            other_person = np.random.choice(ideal_candidates)
        else:
            other_person = np.random.choice(valid_candidates)

        self.schedule[person, day, watchstation] = 0
        self.schedule[other_person, day, watchstation] = 1
        return [
            (person, day, watchstation, 1),
            (other_person, day, watchstation, 0)
        ]

    def perturb_schedule_change_watchstation(
        self
    ) -> List[Tuple[int, int, int, int]]:
        """
        Change the watchstation of one person
        """
        person = np.random.randint(0, self.num_people)
        # find a day and watchstation where the person is assigned
        # in other words, find a 1 in the schedule
        indices = np.argwhere(self.schedule[person, :, :] == 1)
        if len(indices) == 0:
            return []

        day, watchstation = indices[np.random.randint(0, len(indices))]
        # choose another watchstation
        other_watchstation = np.random.randint(0, self.num_watchstations)
        # get the person on the other watchstation
        other_people = np.argwhere(self.schedule[:, day, other_watchstation] == 1)

        if len(other_people) == 0:
            return []

        other_person = other_people[np.random.randint(0, len(other_people))][0]

        # Return the schedule if either of these assignments are frozen
        if (self.frozen_mask[person, day, watchstation] == 1 or
                self.frozen_mask[other_person, day, other_watchstation] == 1):
            return []

        self.schedule[person, day, watchstation] = 0
        self.schedule[person, day, other_watchstation] = 1
        self.schedule[other_person, day, other_watchstation] = 0
        self.schedule[other_person, day, watchstation] = 1

        return [
            (person, day, watchstation, 1),
            (person, day, other_watchstation, 0),
            (other_person, day, other_watchstation, 1),
            (other_person, day, watchstation, 0)
        ]

    def perturb_schedule_swap_watchstander_day(
        self
    ) -> List[Tuple[int, int, int, int]]:
        """
        Swap one person's watch one day with another day
        """
        day_1 = np.random.randint(0, self.num_days)
        day_2 = np.random.randint(0, self.num_days)
        if day_1 == day_2:
            return []

        watchstation = np.random.randint(0, self.num_watchstations)

        # Find potential watchstanders for the selected shift on each day
        person_1_candidates = np.argwhere(self.schedule[:, day_1, watchstation] == 1)
        person_2_candidates = np.argwhere(self.schedule[:, day_2, watchstation] == 1)

        # If either variables are zero, there is no shift to swap.
        # This means it's likely a non default shift added by the end user.
        if len(person_1_candidates) == 0 or len(person_2_candidates) == 0:
            return []

        person_1 = person_1_candidates[0][0]
        person_2 = person_2_candidates[0][0]

        if person_1 == person_2:
            # same person, no swap needed
            return []
        if np.sum(self.schedule[person_1, day_2, :]) > 0:
            # person_1 is already assigned on day_2
            return []
        if np.sum(self.schedule[person_2, day_1, :]) > 0:
            # person_2 is already assigned on day_1
            return []

        if (self.frozen_mask[person_1, day_1, watchstation] == 1 or
                self.frozen_mask[person_2, day_2, watchstation] == 1):
            return []

        is_ideal_swap = True

        # Check if giving person_1 day_2 creates a back-to-back conflict
        if day_2 > 0:
            adj = day_2 - 1
            rem = np.sum(self.schedule[person_1, adj, :])
            if adj == day_1: rem -= 1
            if rem > 0: is_ideal_swap = False
        if day_2 < self.num_days - 1:
            adj = day_2 + 1
            rem = np.sum(self.schedule[person_1, adj, :])
            if adj == day_1: rem -= 1
            if rem > 0: is_ideal_swap = False

        # Check person 2 getting day 1
        if day_1 > 0:
            adj = day_1 - 1
            rem = np.sum(self.schedule[person_2, adj, :])
            if adj == day_2: rem -= 1
            if rem > 0: is_ideal_swap = False
        if day_1 < self.num_days - 1:
            adj = day_1 + 1
            rem = np.sum(self.schedule[person_2, adj, :])
            if adj == day_2: rem -= 1
            if rem > 0: is_ideal_swap = False

        # Add a 20% chance for a non-ideal swap to help prevent
        # locking of annealer.
        if not is_ideal_swap and np.random.rand() < 0.80:
            return []

        self.schedule[person_1, day_1, watchstation] = 0
        self.schedule[person_2, day_2, watchstation] = 0
        self.schedule[person_1, day_2, watchstation] = 1
        self.schedule[person_2, day_1, watchstation] = 1

        return [
            (person_1, day_1, watchstation, 1),
            (person_2, day_2, watchstation, 1),
            (person_1, day_2, watchstation, 0),
            (person_2, day_1, watchstation, 0)
        ]

    def perturb_schedule_move_day(self, schedule: np.ndarray) -> np.ndarray:
        """
        Move one whole day and shift the rest of the schedule
        """
        # Prevent day shifting to respect frozen days
        if len(self.frozen_coordinates) > 0:
            return schedule

        day = np.random.randint(0, self.num_days)
        new_position = np.random.randint(0, self.num_days)

        if new_position == day:
            return schedule

        day_data = schedule[:, day, :]
        schedule = np.delete(schedule, day, axis=1)
        schedule = np.insert(schedule, new_position, day_data, axis=1)
        return schedule