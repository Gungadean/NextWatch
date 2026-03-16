#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
main.py

The entry point for the FastAPI backend application.

@author: Ryan Huston
@email: ryanjhuston@comcast.net
"""
from starlette.requests import Request

from utils.logger import logger
import os
import sys
from contextlib import asynccontextmanager

from alembic.config import Config

from alembic import command
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect

from database.database import engine
from routers import auth, account, position, employee, schedule, request, template

from config.config import settings
from utils.tests.seed_data import seed_database, create_default_admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up NextWatch...")

    # Connect to the database and see if the tables exist
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    is_first_run = len(existing_tables) == 0

    if is_first_run:
        logger.info("No tables found in the database. Initializing...")

    logger.info("Verifying database schema...")
    current_dir = os.path.dirname(os.path.abspath(__file__))
    alembic_ini_path = os.path.join(current_dir, "alembic.ini")

    alembic_cfg = Config(alembic_ini_path)
    command.upgrade(alembic_cfg, "head")
    logger.info("Database schema is up to date!")

    if os.getenv("TEST_SEED", "").lower() == "true":
        logger.info("TEST_SEED flag detected. Seeding database with test data...")
        seed_database()
    elif is_first_run:
        logger.info("Fresh install detected! Creating default Admin account...")
        create_default_admin(is_test_seed=False)

    yield

    logger.info("Shutting down NextWatch...")


# Initialize the main application
app = FastAPI(
    lifespan=lifespan,
    title="NextWatch API",
    version=settings.version,
    description="API for the NextWatch scheduling system."
)


# Retrieve the global API prefix (e.g., "/api") from configuration
prefix = settings.api_prefix

# Add all router endpoints to app and apply prefix from config.
app.include_router(auth.router, prefix=prefix)
app.include_router(account.router, prefix=prefix)
app.include_router(position.router, prefix=prefix)
app.include_router(template.router, prefix=prefix)
app.include_router(employee.router, prefix=prefix)
app.include_router(schedule.router, prefix=prefix)
app.include_router(request.router, prefix=prefix)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=settings.allow_credentials,
    allow_methods=settings.allow_methods,
    allow_headers=settings.allow_headers,
)


if __name__ == "__main__":
    """
    Application Entry Point.
    """
    import uvicorn

    if "--test-seed" in sys.argv:
        os.environ["TEST_SEED"] = "True"
        sys.argv.remove("--test-seed")

    uvicorn.run(
        app="main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        access_log=settings.debug,
        log_config=None
    )