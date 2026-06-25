"""Add EmployeeInvite model

Revision ID: dedb5e72fd75
Revises: 32286150cfff
Create Date: 2026-06-10 18:20:12.681712

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = 'dedb5e72fd75'
down_revision: Union[str, Sequence[str], None] = '32286150cfff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()

    # Safely create the table only if it doesn't already exist
    if 'employeeinvite' not in tables:
        op.create_table('employeeinvite',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('employee_id', sa.Integer(), nullable=False),
            sa.Column('token', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['employee_id'], ['employee.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('employeeinvite', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_employeeinvite_token'), ['token'], unique=True)


def downgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()

    if 'employeeinvite' in tables:
        with op.batch_alter_table('employeeinvite', schema=None) as batch_op:
            batch_op.drop_index(batch_op.f('ix_employeeinvite_token'))
        op.drop_table('employeeinvite')