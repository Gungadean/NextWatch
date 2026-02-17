#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
config.py

Handles the application configuration management.
"""

# TODO: Migrate to pydantic configuration

import os
import configparser

from secrets import token_hex

# Initialize the global configuration parser instance
config = configparser.ConfigParser()


def initialize_config():
    """
    Initialize the configuration settings.
    """
    if not os.path.exists('config.ini'):
        # API Host settings: defines where the backend service is running
        config['HOST'] = {
            'scheme': 'http',
            'host': 'localhost',
            'port': '8000',
            'path': '/api'
        }

        # Authentication settings: Includes JWT secrets and expiration times.
        # token_hex(32) generates a secure 64-character hex string.
        config['AUTH'] = {
            "secret_access": token_hex(32),
            "secret_refresh": token_hex(32),
            "algorithm": "HS256",
            "access_token_expire_minutes": 15,
            "refresh_token_expire_days": 30
        }

        # CORS (Cross-Origin Resource Sharing) settings for frontend integration
        config['CORS'] = {
            'allow_origins': ['http://localhost:5173'],
            'allow_credentials': True,
            'allow_methods': ['*'],
            'allow_headers': ['*']
        }

        with open('config.ini', 'w') as configfile:
            config.write(configfile)
    else:
        config.read('config.ini')


def get_config():
    """
    Retrieve the active configuration object.

    Returns:
        configparser.ConfigParser: The populated configuration instance.
    """
    return config


initialize_config()