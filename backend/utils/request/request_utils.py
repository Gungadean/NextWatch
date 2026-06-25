#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
request_utils.py

This module provides utility functions for processing Time Off Requests.
"""
from typing import List

from sqlmodel import Session

from database.models import TimeOffRequest, User


manager_roles = ["admin", "manager"]


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
    # Force load employee into memory to prevent lazy load failure
    _ = request.employee

    # Detach object from session before modifying
    session.expunge(request)
    request.request_type = "Private"
    #request.reason = None

    return request


def sanitize_requests(requests: List[TimeOffRequest], user: User, session: Session) -> List[TimeOffRequest]:
    """
    Method for sanitizing a list of TimeOffRequests
    """
    can_view_all = user.role.lower() in ["admin", "manager"]

    if can_view_all:
        return requests

    for_removal = []

    for request in requests:
        # Handle case where user.employee might be None (admin without employee profile)
        user_emp_id = user.employee.id if user.employee else None
        is_owner = (user_emp_id is not None and user_emp_id == request.employee_id)

        if not is_owner and request.status == "Denied":
            for_removal.append(request)

        if not is_owner:
            sanitize_request(request, user, session)

    return [req for req in requests if req not in for_removal]