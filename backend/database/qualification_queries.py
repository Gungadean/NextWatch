"""
Module containing functions to perform queries on qualifications table.
"""
from sqlmodel import Session, select

from backend.database.database import engine, Qualification

"""
id int
name str
description str
created_at string
"""

def get_qualifications():
    """

    :return:
    """
    with Session(engine) as session:
        statement = select(Qualification)
        qualifications = session.exec(statement).all()
        return qualifications


def add_qualification(qualification: Qualification):
    """

    :param qualification:
    :return:
    """
    with Session(engine) as session:
        session.add(qualification)
        session.commit()


def delete_qualification(qualification_id: int):
    with Session(engine) as session:
        statement = select(Qualification).where(Qualification.id == qualification_id)