#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
database.py

Defines the SQLModel database schema and initialization logic.
"""
import logging

from sqlmodel import create_engine, Session

from config.config import settings

# Create engine from database location and create all SQLModel tables. Only SQLite for now.
if settings.database_url.startswith("sqlite:///"):
    # check_same_thread=False is needed for SQLite when used with FastAPI/multi-threading.
    engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(settings.database_url)

def get_session():
    """
    Dependency generator for database sessions.
    Yields a session context for use in API endpoints.
    """
    with Session(engine) as session:
        try:
            yield session
        except Exception as e:
            logging.error(f"Database error occurred, rolling back transaction: {e}")
            session.rollback()
            raise
        finally:
            session.close()
