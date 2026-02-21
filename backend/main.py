#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
main.py

The entry point for the FastAPI backend application.

@author: Ryan Huston
@email: ryanjhuston@comcast.net
"""
import sys

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, account, position, employee, schedule, request

from config.config import settings
from utils.tests.seed_data import seed_database


# Initialize the main application
app = FastAPI(
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

    Checks for command-line arguments before starting the server.

    Usage:
        python main.py             -> Starts the server normally.
        python main.py --test-seed -> Populates the DB with dummy data, then starts.
    """
    if len(sys.argv) > 1:
        arg = sys.argv[1]

        if arg == "--test-seed":
            seed_database()

    uvicorn.run(app, host="0.0.0.0", port=8000)