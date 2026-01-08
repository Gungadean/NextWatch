from datetime import datetime

from pydantic import BaseModel


class Qualification(BaseModel):
    """
    A model representing qualification data
    """
    name: str
    description: str
    created_at: datetime