#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
seed_data.py

Database Seeding Utility.

This script populates the database with initial demo data, including:
1. An admin user.
2. A roster of fake employees and standard watch positions (OOD, CDO, etc.).
3. Random qualification assignments (linking employees to positions).
4. A spread of random leave requests throughout the current year.
5. A fully generated, valid schedule for the current month using the genetic algorithm.
"""

import random
import calendar
import numpy as np
from datetime import datetime, date, timedelta
from sqlmodel import Session, select

from database.database import (
    Employee,
    Position,
    EmployeePosition,
    TimeOffRequest,
    Shift,
    User,
    engine
)
from schemas.schedule_schemas import ScheduleRequest
from ewatchbill.logic.make_schedule import make_schedule
from ewatchbill.encoding.from_watchbill_request import from_watchbill_request
from utils.auth.auth_utils import get_password_hash
from utils.schedule.schedule_builder import build_watchbill_params

CURRENT_YEAR = datetime.now().year
CURRENT_MONTH = datetime.now().month


def get_month_date_range():
    """
    Calculate the start and end dates for the current month.

    Returns:
        Tuple[date, date]: (First day of month, Last day of month).
    """
    _, last_day = calendar.monthrange(CURRENT_YEAR, CURRENT_MONTH)
    start_date = date(CURRENT_YEAR, CURRENT_MONTH, 1)
    end_date = date(CURRENT_YEAR, CURRENT_MONTH, last_day)
    return start_date, end_date


def seed_employees_and_positions(session: Session):
    """
    Create standard watch stations and a roster of fake employees.

    Also handles the Many-to-Many linking (Qualifications), ensuring every
    position has enough qualified people to form a valid schedule.

    Args:
        session (Session): Database session.

    Returns:
        Tuple[List[Employee], List[Position]]: The lists of created objects.
    """
    print("Seeding employees and positions...")

    # Create positions
    position_data = [
        {"name": "CDO", "description": "Command Duty Officer", "color": "#2B6CB0"},
        {"name": "OOD", "description": "Officer of the Deck", "color": "#2F855A"},
        {"name": "JOOD", "description": "Junior Officer of the Deck", "color": "#C05621"},
        {"name": "MOOW", "description": "Messenger of the Watch", "color": "#805AD5"}
    ]

    db_positions = []
    for p in position_data:
        existing = session.exec(select(Position).where(Position.name == p["name"])).first()
        if not existing:
            new_p = Position(
                name=p["name"],
                description=p["description"],
                color=p["color"],
                created_by=1 # Assign to admin
            )
            session.add(new_p)
            db_positions.append(new_p)
        else:
            db_positions.append(existing)
    session.flush()

    # Create employees
    first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth",
                   "William", "Barbara", "Richard", "Susan", "Joseph"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
                  "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson"]

    db_employees = []
    for i in range(15):
        email = f"{first_names[i].lower()}.{last_names[i].lower()}{i}@example.com"
        existing = session.exec(select(Employee).where(Employee.email == email)).first()

        if not existing:
            new_e = Employee(
                first_name=first_names[i],
                last_name=last_names[i],
                middle_name="X.",
                email=email,
                created_at=datetime.now()
            )
            session.add(new_e)
            db_employees.append(new_e)
        else:
            db_employees.append(existing)
    session.flush()

    # Ensure every position has at least 5 people
    for p in db_positions:
        # Pick 5 random people to definitely have this position
        guaranteed_holders = random.sample(db_employees, k=5)
        for employee in guaranteed_holders:
            link_exists = session.exec(select(EmployeePosition).where(
                EmployeePosition.employee_id == employee.id,
                EmployeePosition.position_id == p.id
            )).first()
            if not link_exists:
                session.add(EmployeePosition(employee_id=employee.id, position_id=p.id))

    # Give every employee 1 or 2 random positions.
    for employee in db_employees:
        num_positions = random.randint(1, 2)
        selected = random.sample(db_positions, k=num_positions)
        for p in selected:
            link_exists = session.exec(select(EmployeePosition).where(
                EmployeePosition.employee_id == employee.id,
                EmployeePosition.position_id == p.id
            )).first()
            if not link_exists:
                session.add(EmployeePosition(employee_id=employee.id, position_id=p.id))

    session.commit()
    print(f"   - employees: {len(db_employees)}, positions: {len(db_positions)}")
    return db_employees, db_positions


def seed_leave_requests(session: Session, employees):
    """
    Generate random time-off requests spread throughout the current year.

    This ensures the 'Request' tab in the UI has data and that the
    scheduling algorithm has conflicts to work around.

    Args:
        session (Session): Database session.
        employees (List[Employee]): The list of employees to generate requests for.
    """
    print("Seeding Year-Long Leave Requests...")

    # Configuration
    requests_per_person_range = (3, 8)
    leave_types = ["Vacation", "Medical", "Personal", "Training"]
    # mostly Approved to ensure they block the schedule generator
    statuses = ["Approved", "Approved", "Approved", "Pending", "Denied"]

    count = 0

    for employee in employees:
        # Determine how many requests this specific employee submits
        num_requests = random.randint(*requests_per_person_range)

        for _ in range(num_requests):
            # Randomize Dates (Entire Year)
            month = random.randint(1, 12)
            # Limit start day to 28 to avoid invalid dates (like Feb 30th)
            start_day = random.randint(1, 28)

            start_date = date(CURRENT_YEAR, month, start_day)

            # Duration: Weighted random.
            # 80% chance of short leave (1-3 days), 20% chance of long vacation (4-14 days)
            if random.random() < 0.8:
                duration = random.randint(1, 3)
            else:
                duration = random.randint(4, 14)

            end_date = start_date + timedelta(days=duration)

            # Constrain to current year (clip if it goes into next year)
            if end_date.year > CURRENT_YEAR:
                end_date = date(CURRENT_YEAR, 12, 31)

            # Randomize Metadata
            r_type = random.choice(leave_types)
            r_status = random.choice(statuses)

            # We check if this employee already has a request starting on this specific day
            existing = session.exec(select(TimeOffRequest).where(
                TimeOffRequest.employee_id == employee.id,
                TimeOffRequest.start_date == start_date
            )).first()

            if not existing:
                lr = TimeOffRequest(
                    employee_id=employee.id,
                    start_date=start_date,
                    end_date=end_date,
                    request_type=r_type,
                    status=r_status,
                    created_at=datetime.now()
                )
                session.add(lr)
                count += 1

    session.commit()
    print(f"   - Seeded {count} leave requests across {CURRENT_YEAR}.")


def generate_month_schedule(session: Session):
    """
    Execute the genetic algorithm to generate and save a schedule for the current month.

    This acts as an integration test for the scheduling engine and populates
    the 'Shifts' table so the Calendar UI is not empty on first load.
    """
    print("Generating Schedule for Current Month...")

    start_date, end_date = get_month_date_range()

    all_positions = session.exec(select(Position)).all()
    position_ids = [q.id for q in all_positions]

    if not position_ids:
        print("   ! No positions found. Skipping schedule gen.")
        return

    req = ScheduleRequest(
        start_date=start_date,
        end_date=end_date,
        position_ids=position_ids,
        min_days_off=1,
        max_steps=5000
    )

    params = build_watchbill_params(req)

    (
        qualification_matrix,
        conflict_matrix,
        holiday_mask,
        offset_matrix,
        min_days_off
    ) = from_watchbill_request(params)

    print(f"   - Scheduling {len(params.watchstanders)} people for {len(params.watchstations)} stations over {(end_date - start_date).days + 1} days.")

    try:
        generator = make_schedule(
            num_people=len(params.watchstanders),
            num_days=(params.end - params.start).days + 1,
            num_watchstations=len(params.watchstations),
            min_days_off_between_duty=min_days_off,
            max_steps=params.max_iteration_steps,
            qualification_matrix=qualification_matrix,
            conflict_matrix=conflict_matrix,
            holiday_mask=holiday_mask,
            offset_matrix=offset_matrix
        )

        best_schedule = None
        best_score = float('inf')

        for schedule, score, is_legal in generator:
            if best_schedule is None or score < best_score:
                best_schedule = schedule
                best_score = score

    except ValueError as e:
        print(f"   Constraint Error: {e}")
        return
    except Exception as e:
        print(f"   Unexpected Error: {e}")
        return

    if best_schedule is None:
        print("   Failed to generate a schedule.")
        return

    print(f"  Schedule Generated! Final Score: {best_score}")

    shifts_created = 0

    num_people, num_days, num_stations = best_schedule.shape

    for d in range(num_days):
        current_date = params.start + timedelta(days=d)

        for s in range(num_stations):
            assigned_indices = np.where(best_schedule[:, d, s] == 1)[0]

            if assigned_indices.size == 0:
                continue

            watchstander_idx = assigned_indices[0]
            employee_id = params.watchstanders[watchstander_idx].id
            position_id = params.watchstations[s].id

            start_dt = datetime.combine(current_date, datetime.min.time().replace(hour=8))
            end_dt = datetime.combine(current_date, datetime.min.time().replace(hour=16))

            shift = Shift(
                employee_id=employee_id,
                position_id=position_id,
                shift_date=current_date,
                start_time=start_dt,
                end_time=end_dt,
            )
            session.add(shift)
            shifts_created += 1

    session.commit()
    print(f"   Saved {shifts_created} shifts to database.")


def seed_database():
    """
    Main entry point for the seeding process.
    Ensures an admin user exists, then triggers data generation.
    """
    with Session(engine) as session:
        statement = select(User.id).where(User.username == "admin")

        if not session.exec(statement).first():
            session.add(User(
                username="admin",
                email="admin@example.com",
                role="admin",
                password_hashed=get_password_hash("password")
            ))
            session.commit()

        employees, _ = seed_employees_and_positions(session)
        seed_leave_requests(session, employees)
        generate_month_schedule(session)


if __name__ == "__main__":
    seed_database()