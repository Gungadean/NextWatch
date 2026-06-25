"""Add split_increment field for auto splitting templates.

Revision ID: b095536575ce
Revises: b0012876287e
Create Date: 2026-04-27 09:10:38.930100

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'b095536575ce'
down_revision: Union[str, Sequence[str], None] = 'b0012876287e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    # Inspect the current state of the database
    inspector = sa.inspect(connection)
    existing_columns = [col['name'] for col in inspector.get_columns('shifttemplate')]

    # Safely add the column only if it wasn't left over from a previous crash
    with op.batch_alter_table('shifttemplate', schema=None) as batch_op:
        if 'split_increment' not in existing_columns:
            batch_op.add_column(sa.Column('split_increment', sa.Integer(), nullable=True))


def downgrade() -> None:
    connection = op.get_bind()

    # Inspect the current state of the database
    inspector = sa.inspect(connection)
    existing_columns = [col['name'] for col in inspector.get_columns('shifttemplate')]

    # Safely drop the column only if it exists
    with op.batch_alter_table('shifttemplate', schema=None) as batch_op:
        if 'split_increment' in existing_columns:
            batch_op.drop_column('split_increment')