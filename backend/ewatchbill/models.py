#  Original code courtesy of Carl Kolon and his open source watchbill generator.
#  Write-up on original code: https://carlkolon.com/2022/02/22/watchbillplanning/
#
#  Copyright (c). Carl Kolon
#
#  Modified by Ryan Huston 2026

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field

from schemas.schedule_schemas import DraftWatchstander


class Watchstation(BaseModel):
    id: int
    name: str
    color: str


class Watchstander(BaseModel):
    id: int
    name: str
    watchstations: List[int]
    offset: int
    max_shift_length: Optional[int] = None
    target_weekly_hours: Optional[int] = None


class Conflict(BaseModel):
    watchstander: int
    date: date


class Assignment(BaseModel):
    watchstander: DraftWatchstander
    watchstation: Watchstation
    date: date
    start_time: str | None = None
    end_time: str | None = None
    is_fixed: bool = False
    template_id: int | None = None
    split_increment: int | None = None


class WatchbillParams(BaseModel):
    start: date
    end: date
    watchstanders: List[DraftWatchstander] = Field(min_length=1)
    watchstations: List[Watchstation] = Field(min_length=1)
    conflicts: List[Conflict]
    holidays: List[date]
    min_days_off_between_duty: int = Field(gt=-1)
    max_days_off_between_duty: int = Field(gt=0)
    max_iteration_steps: int = Field(gt=0, le=100000)
    frozen_assignments: List[Assignment] = Field(default_factory=list)
    skeleton: List[Assignment] = Field(default_factory=list)


class WatchbillResponse(BaseModel):
    score_history: List[float]
    assignments: List[Assignment]
    complete: bool
    error: str | None = None