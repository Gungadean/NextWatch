"""Add max_consecutive_days and min_consecutive_days to Employee for more dynamic scheduling.

Revision ID: 32286150cfff
Revises: b095536575ce
Create Date: 2026-05-04 20:29:42.264048

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '32286150cfff'
down_revision: Union[str, Sequence[str], None] = 'b095536575ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    # Inspect the current state of the database
    inspector = sa.inspect(connection)
    existing_columns = [col['name'] for col in inspector.get_columns('employee')]

    # Safely add the columns only if they weren't left over from a previous crash
    with op.batch_alter_table('employee', schema=None) as batch_op:
        if 'max_consecutive_days' not in existing_columns:
            batch_op.add_column(sa.Column('max_consecutive_days', sa.Integer(), nullable=True))

    with op.batch_alter_table('employee', schema=None) as batch_op:
        if 'min_consecutive_days' not in existing_columns:
            batch_op.add_column(sa.Column('min_consecutive_days', sa.Integer(), nullable=True))


def downgrade() -> None:
    connection = op.get_bind()

    # Inspect the current state of the database
    inspector = sa.inspect(connection)
    existing_columns = [col['name'] for col in inspector.get_columns('employee')]

    # Safely drop the columns only if they exist
    with op.batch_alter_table('employee', schema=None) as batch_op:
        if 'min_consecutive_days' in existing_columns:
            batch_op.drop_column('min_consecutive_days')

    with op.batch_alter_table('employee', schema=None) as batch_op:
        if 'max_consecutive_days' in existing_columns:
            batch_op.drop_column('max_consecutive_days')