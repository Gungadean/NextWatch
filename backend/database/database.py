"""
Create models for database and then generate local databse file.
"""
from datetime import datetime

from sqlmodel import SQLModel, create_engine, Field


class User(SQLModel, table=True):
    """
    SQLModel representing a user in the database.
    """
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(..., max_length=50)
    email: str = Field(..., max_length=50)
    password_hashed: str = Field(..., max_length=50)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default=None)
    last_login: datetime = Field(default=None)


class Qualification(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    description: str = Field(..., max_length=1000)


class UserQualification(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int | None = Field(default=None, foreign_key="user.id")
    qualification: int | None = Field(default=None, foreign_key="qualification.id")


# Create engine from database location and create all SQLModel tables.
engine = create_engine("sqlite:///database.db")
SQLModel.metadata.create_all(engine)