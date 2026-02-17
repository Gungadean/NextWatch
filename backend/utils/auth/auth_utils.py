#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
auth_utils.py

This module provides low-level authentication utilities.
"""

import bcrypt
from fastapi.security import OAuth2PasswordBearer

from ...config.config import get_config

# Define the security parameters for the application.
SECRET_ACCESS = get_config().get("AUTH", "secret_access")
SECRET_REFRESH = get_config().get("AUTH", "secret_refresh")
ALGORITHM = get_config().get("AUTH", "algorithm")
TOKEN_ACCESS_EXPIRATION = int(get_config().get("AUTH", "access_token_expire_minutes"))
TOKEN_REFRESH_EXPIRATION = int(get_config().get("AUTH", "refresh_token_expire_days"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_password_hash(password: str) -> str:
    """
    Hash a plain-text password using Bcrypt.

    Bcrypt automatically handles salting, making it resistant to rainbow table attacks.
    The resulting hash is decoded to a UTF-8 string for database storage.

    Args:
        password (str): The plain-text password to hash.

    Returns:
        str: The hashed password string.
    """
    pwd_bytes = password.encode("utf-8")
    hashed_password = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")

    return hashed_password


def verify_password(plain_password: str, hashed_password: bytes) -> bool:
    """
    Verify a plain-text password against a stored Bcrypt hash.

    Args:
        plain_password (str): The password provided by the user during login.
        hashed_password (bytes): The bytes of the hash stored in the database.

    Returns:
        bool: True if the password matches the hash, False otherwise.
    """
    password_bytes = plain_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_password)
