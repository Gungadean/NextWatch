#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
main.py

The entry point for the FastAPI backend application.

@author: Ryan Huston
@email: ryanjhuston@comcast.net
"""
import os
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import auth, account, position, employee, schedule, request

from backend.config.config import get_config
from backend.utils.tests.seed_data import seed_database


env_path = Path(__file__).resolve().parent.parent / ".env"


# Parse root .env file
def load_env_file(filepath):
    if not filepath.exists():
        return

    with open(filepath, "r") as f:
        for line in f:
            # Strip whitespace and ignore comments
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            # Split on the first '=' only
            if "=" in line:
                key, value = line.split("=", 1)
                # Clean up quotes if present
                key = key.strip()
                value = value.strip().strip("'").strip('"')

                # Set the environment variable
                os.environ[key] = value

load_env_file(env_path)

version = os.environ.get("VITE_APP_VERSION", "0.0.0")

# Initialize the main application
app = FastAPI(
    title="NextWatch API",
    version=version,
    description="API for the NextWatch scheduling system."
)

# Retrieve the global API prefix (e.g., "/api") from configuration
prefix = get_config().get('HOST', 'path')

# Add all router endpoints to app and apply prefix from config.
app.include_router(auth.router, prefix=prefix)
app.include_router(account.router, prefix=prefix)
app.include_router(position.router, prefix=prefix)
app.include_router(employee.router, prefix=prefix)
app.include_router(schedule.router, prefix=prefix)
app.include_router(request.router, prefix=prefix)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_config().get('CORS', 'allow_origins'),
    allow_credentials=get_config().get('CORS', 'allow_credentials'),
    allow_methods=get_config().get('CORS', 'allow_methods'),
    allow_headers=get_config().get('CORS', 'allow_headers'),
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