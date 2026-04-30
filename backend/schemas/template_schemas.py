#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston
from datetime import time

from pydantic import BaseModel, ConfigDict


class ShiftTemplateCreate(BaseModel):
    """
    Model for create a new shift template.
    """
    name: str
    start_time: time
    end_time: time
    split_increment: int | None = None


class ShiftTemplateRead(ShiftTemplateCreate):
    """
    Model for sending shift template info to the frontend
    """
    model_config = ConfigDict(from_attributes=True)

    id: int