#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
request_utils.py

This module provides utility functions for processing Time Off Requests.
"""

from sqlmodel import Session
from database.database import TimeOffRequest, User


def sanitize_request(request: TimeOffRequest, user: User, session: Session) -> TimeOffRequest:
    """
    Sanitize a time-off request based on the viewer's permissions.

    Privacy Logic:
    - **Admins/Managers**: Can see full details (type, reason, etc.).
    - **Owner (The Employee)**: Can see their own full details.
    - **Peers (Other Employees)**: Can see *that* a request exists (dates/status)
      but the `request_type` is redacted to "Private" to protect medical/personal privacy.

    Args:
        request (TimeOffRequest): The request object to process.
        user (User): The user attempting to view the request.
        session (Session): The active database session (needed for expunging).

    Returns:
        TimeOffRequest: The potentially modified (sanitized) request object.
    """
    can_view_all = user.role in ["admin", "manager"]

    # Handle case where user.employee might be None (admin without employee profile)
    user_emp_id = user.employee.id if user.employee else None
    is_owner = (user_emp_id is not None and user_emp_id == request.employee_id)

    if not can_view_all and not is_owner:
        # Detach object from session before modifying
        session.expunge(request)
        request.request_type = "Private"

    return request