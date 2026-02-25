#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
config.py

Handles the application configuration management.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings initializer.
    """
    # Host
    scheme: str = "http"
    host: str = "localhost"
    port: int = 8000
    api_prefix: str = "/api/v1"

    # Auth
    secret_access: str
    secret_refresh: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # CORS
    allow_origins: list[str] = ["http://localhost:5173"]
    allow_credentials: bool = True
    allow_methods: list[str] = ["*"]
    allow_headers: list[str] = ["*"]

    # Database
    database_url: str = "sqlite:///./database.db"

    # Dev
    debug: bool = False
    version: str = "0.1.0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# Instantiate settings for importing
settings = Settings()