#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#  Modified by Ryan Huston. 2026

from datetime import date
from typing import List

from pydantic import BaseModel, Field


class Watchstation(BaseModel):
    id: int
    name: str
    color: str


class Watchstander(BaseModel):
    id: int
    name: str
    watchstations: List[int]
    offset: int


class Conflict(BaseModel):
    watchstander: int
    date: date


class WatchbillParams(BaseModel):
    start: date
    end: date
    watchstanders: List[Watchstander] = Field(min_length=1)
    watchstations: List[Watchstation] = Field(min_length=1)
    conflicts: List[Conflict]
    holidays: List[date]
    min_days_off_between_duty: int = Field(gt=-1)
    max_iteration_steps: int = Field(gt=0, le=100000)


class Assignment(BaseModel):
    watchstander: Watchstander
    watchstation: Watchstation
    date: date


class WatchbillResponse(BaseModel):
    score_history: List[float]
    assignments: List[Assignment]
    complete: bool
    error: str | None = None