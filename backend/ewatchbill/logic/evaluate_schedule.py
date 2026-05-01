#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
evaluate_schedule.py

Module accepting a draft schedule and validating its fairness while generating
a list of errors/warnings to return to the frontend for display.
"""

from datetime import datetime

import numpy as np
from typing import List, Dict

from pydantic import BaseModel

from .constraints import is_legal
from .objectives import get_score_breakdown
from .translator import ScheduleTranslator
from ..encoding.from_watchbill_request import from_watchbill_request, parse_time
from ..models import WatchbillParams, Assignment


class ValidationResponse(BaseModel):
    """
    A draft from the frontend to be validated against the application contraint model
    """
    is_valid: bool
    hard_error: List[str]
    soft_warnings: List[str]
    score_breakdown: dict[str, float]


def _normalize_time(t) -> str:
    """Converts time objects or strings into a standard HH:MM format for exact matching."""
    if not t: return ""
    if hasattr(t, "strftime"): return t.strftime("%H:%M")
    parts = str(t).split(":")
    if len(parts) >= 2: return f"{int(parts[0]):02d}:{int(parts[1]):02d}"
    return str(t)


def evaluate_draft_schedule(
    watchbill_params: WatchbillParams,
    draft_assignments: List[Assignment],
    target_date: str = None,
    target_person_names: List[str] = None,
    published_buffers: List[Dict] = None,
    is_global_audit: bool = False
) -> ValidationResponse:
    """
    Acts as a Single Source of Truth for frontend validation.
    Converts a drafted schedule into a matrix and audits it against the core math engine.
    """
    safe_assignments = draft_assignments or []

    # Use getattr to prevent missing attribute crashes on plain dicts
    dynamic_assignments = [a for a in safe_assignments if not getattr(a, "is_fixed", False)]
    watchbill_params.skeleton = dynamic_assignments

    # Parse the request to get the exact same matrices the math engine uses
    (
        qualification_matrix,
        conflict_matrix,
        holiday_mask,
        offset_matrix,
        min_days_off,
        max_days_off,
        headcount_matrix,
        shift_times,
        unique_shift_slots,
        frozen_assignments_matrix,
    ) = from_watchbill_request(watchbill_params)

    num_people = len(watchbill_params.watchstanders)
    num_days = (watchbill_params.end - watchbill_params.start).days + 1
    num_watchstations = len(unique_shift_slots)

    translator = ScheduleTranslator(
        watchstanders=watchbill_params.watchstanders,
        watchstations=watchbill_params.watchstations,
        unique_shift_slots=unique_shift_slots,
        start_date=watchbill_params.start
    )

    schedule_array = np.zeros((num_people, num_days, num_watchstations), dtype=int)
    person_to_index = {ws.id: idx for idx, ws in enumerate(watchbill_params.watchstanders)}

    for assignment in draft_assignments:
        p_idx = person_to_index.get(assignment.watchstander.id)
        d_idx = (assignment.date - watchbill_params.start).days

        if p_idx is None or not (0 <= d_idx < num_days):
            continue

        a_st = parse_time(assignment.start_time) if assignment.start_time else 0.0
        a_et = parse_time(assignment.end_time) if assignment.end_time else 24.0
        a_dur = a_et - a_st if a_et > a_st else (a_et + 24.0) - a_st
        if a_dur == 0:
            a_dur = 24.0

        mapped_slots = 0

        # Distribute the UI assignment into all corresponding shattered matrix slots
        for s_idx, slot in enumerate(unique_shift_slots):
            if slot[0] == assignment.watchstation.id:
                slot_st = parse_time(slot[1]) if slot[1] else 0.0
                slot_et = parse_time(slot[2]) if slot[2] else 24.0
                slot_dur = slot_et - slot_st if slot_et > slot_st else (slot_et + 24.0) - slot_st
                if slot_dur == 0:
                    slot_dur = 24.0

                def in_range(x: float, start: float, end: float) -> bool:
                    if start <= end:
                        return start <= x <= end
                    return x >= start or x <= end

                mid = (slot_st + slot_dur / 2.0) % 24.0

                # Map if the assignment is 24h, or if the matrix slot fits perfectly inside the UI block
                if a_dur >= 24.0 or (slot_dur <= a_dur and in_range(slot_st, a_st, a_et) and in_range(slot_et, a_st,
                                                                                                      a_et) and in_range(
                        mid, a_st, a_et)):
                    schedule_array[p_idx, d_idx, s_idx] += 1
                    mapped_slots += 1

        # Fallback for ad-hoc shifts that don't align with templates
        if mapped_slots == 0:
            for s_idx, slot in enumerate(unique_shift_slots):
                if slot[0] == assignment.watchstation.id:
                    schedule_array[p_idx, d_idx, s_idx] += 1
                    break

    is_valid_math, all_hard_errors = is_legal(
        schedule_array,
        qualification_matrix=qualification_matrix,
        conflict_matrix=conflict_matrix,
        shift_times=shift_times,
        frozen_assignments_matrix=frozen_assignments_matrix,
        translator=translator
    )

    breakdown, detailed_warnings = get_score_breakdown(
        schedule_array,
        holiday_mask=holiday_mask,
        offset_matrix=offset_matrix,
        min_days_off=min_days_off,
        max_days_off=max_days_off,
        headcount_matrix=headcount_matrix,
        conflict_matrix=conflict_matrix,
        shift_times=shift_times,
        translator=translator
    )

    if is_global_audit:
        return ValidationResponse(
            is_valid=is_valid_math,
            hard_error=all_hard_errors,
            soft_warnings=detailed_warnings,
            score_breakdown=breakdown
        )

    if target_person_names is None: target_person_names = []
    if published_buffers is None: published_buffers = []

    buffer_by_person = {}
    for b in published_buffers:
        name = b['name']
        if name not in buffer_by_person: buffer_by_person[name] = []
        buffer_by_person[name].append(datetime.strptime(b['date'], "%Y-%m-%d").date())

    draft_by_person = {}
    for a in draft_assignments:
        name = a.watchstander.name
        if name not in draft_by_person: draft_by_person[name] = []
        draft_by_person[name].append(a.date)

    for name in target_person_names:
        if name in draft_by_person and name in buffer_by_person:
            for d_date in draft_by_person[name]:
                for b_date in buffer_by_person[name]:
                    gap = abs((d_date - b_date).days)
                    if 0 < gap <= min_days_off:
                        detailed_warnings.append(
                            f"Boundary Conflict: {name} works on {b_date.strftime('%b %d')} (Published) and {d_date.strftime('%b %d')} (Draft), violating the {min_days_off}-day rest rule.")

    filtered_warnings = []
    filtered_hard_errors = []

    target_date_str = None
    if target_date:
        try:
            target_date_str = datetime.strptime(target_date, "%Y-%m-%d").strftime("%b %d")
        except:
            pass

    # Filter Soft Warnings
    for w in detailed_warnings:
        if "Utilization:" in w or "Engagement:" in w or "Headcount:" in w:
            continue
        if target_date_str:
            if target_date_str in w:
                for name in target_person_names:
                    if name in w:
                        if w not in filtered_warnings: filtered_warnings.append(w)
                        break
        else:
            filtered_warnings.append(w)

    # Filter Hard Errors
    for err in all_hard_errors:
        if target_date_str:
            if target_date_str in err:
                for name in target_person_names:
                    if name in err:
                        if err not in filtered_hard_errors: filtered_hard_errors.append(err)
                        break
        else:
            filtered_hard_errors.append(err)

    # If there are NO hard errors for THIS specific day, the day is valid and can be saved
    final_is_valid = len(filtered_hard_errors) == 0

    return ValidationResponse(
        is_valid=final_is_valid,
        hard_error=filtered_hard_errors,
        soft_warnings=filtered_warnings,
        score_breakdown=breakdown
    )