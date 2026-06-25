"""Add optional max hour requirements for employees

Revision ID: b0012876287e
Revises: 94412a83601a
Create Date: 2026-04-23 10:37:40.353677

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'b0012876287e'
down_revision: Union[str, Sequence[str], None] = '94412a83601a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    # Inspect the current state of the database to handle partial (crashed) migrations
    inspector = sa.inspect(connection)
    existing_columns = [col['name'] for col in inspector.get_columns('employee')]

    # Safely add the columns only if they weren't left over from a previous crash
    with op.batch_alter_table('employee', schema=None) as batch_op:
        if 'max_shift_length' not in existing_columns:
            batch_op.add_column(sa.Column('max_shift_length', sa.Integer(), nullable=True))

    with op.batch_alter_table('employee', schema=None) as batch_op:
        if 'target_weekly_hours' not in existing_columns:
            batch_op.add_column(sa.Column('target_weekly_hours', sa.Integer(), nullable=True))


def downgrade() -> None:
    connection = op.get_bind()

    inspector = sa.inspect(connection)
    existing_columns = [col['name'] for col in inspector.get_columns('employee')]

    # Safely drop the columns only if they exist
    with op.batch_alter_table('employee', schema=None) as batch_op:
        if 'target_weekly_hours' in existing_columns:
            batch_op.drop_column('target_weekly_hours')

    with op.batch_alter_table('employee', schema=None) as batch_op:
        if 'max_shift_length' in existing_columns:
            batch_op.drop_column('max_shift_length')