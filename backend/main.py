#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston

"""
main.py

@author: Ryan Huston
@email: ryanjhuston@comcast.net
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import auth, account, qualification
from backend.utils.auth.auth_users_utils import create_user, check_user_exists

from backend.config.config import get_config

app = FastAPI()

prefix = get_config().get('HOST', 'path')

app.include_router(auth.router, prefix=prefix)
app.include_router(account.router, prefix=prefix)
app.include_router(qualification.router, prefix=prefix)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_config().get('CORS', 'allow_origins'),
    allow_credentials=get_config().get('CORS', 'allow_credentials'),
    allow_methods=get_config().get('CORS', 'allow_methods'),
    allow_headers=get_config().get('CORS', 'allow_headers'),
)


if __name__ == "__main__":
    if not check_user_exists("admin"):
        create_user(username="admin", email="admin@example.com", password="password")
    uvicorn.run(app, host="0.0.0.0", port=8000)