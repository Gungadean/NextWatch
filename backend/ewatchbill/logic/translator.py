#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
translator.py

Module for handling translation of warning/error messages
"""

from datetime import timedelta

class ScheduleTranslator:
    def __init__(self, watchstanders, watchstations, unique_shift_slots, start_date):
        self.watchstanders = watchstanders
        self.watchstations = watchstations
        self.unique_shift_slots = unique_shift_slots
        self.start_date = start_date

    def get_person(self, p_idx: int) -> str:
        """Converts a person index (e.g., 0) into a name"""
        return getattr(self.watchstanders[p_idx], 'name', f"Person {p_idx+1}")

    def get_station(self, s_idx: int) -> str:
        """Converts a slot index (e.g., 0) into a station name"""
        ws_id = self.unique_shift_slots[s_idx][0]
        return next((w.name for w in self.watchstations if w.id == ws_id), f"Shift {s_idx+1}")

    def get_date(self, d_idx: int) -> str:
        """Converts a day index (e.g., 0) into a calendar string"""
        return (self.start_date + timedelta(days=int(d_idx))).strftime("%b %d")