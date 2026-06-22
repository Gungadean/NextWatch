"""Add applies_on_days and is_fixed to position requirements

Revision ID: 94412a83601a
Revises: db05b31c4cf1
Create Date: 2026-04-22 12:17:01.634675

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '94412a83601a'
down_revision: Union[str, Sequence[str], None] = 'db05b31c4cf1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    # Add the new columns
    with op.batch_alter_table('positionrequirement', schema=None) as batch_op:
        batch_op.add_column(sa.Column('applies_on_days', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('is_fixed', sa.Boolean(), server_default=sa.text('0'), nullable=False))

    # Define the temporary table representation for data migration
    positionrequirement = sa.table(
        'positionrequirement',
        sa.column('id', sa.Integer),
        sa.column('applies_weekdays', sa.Boolean),
        sa.column('applies_weekends', sa.Boolean),
        sa.column('applies_on_days', sa.JSON)
    )

    # Fetch existing data
    results = connection.execute(
        sa.select(
            positionrequirement.c.id,
            positionrequirement.c.applies_weekdays,
            positionrequirement.c.applies_weekends
        )
    ).fetchall()

    # Migrate the data
    for row in results:
        req_id = row.id
        applies_weekdays = row.applies_weekdays
        applies_weekends = row.applies_weekends

        days: list[int] = []
        if applies_weekdays:
            days.extend([0, 1, 2, 3, 4])
        if applies_weekends:
            days.extend([5, 6])

        # Execute the update
        connection.execute(
            positionrequirement.update()
            .where(positionrequirement.c.id == req_id)
            .values(applies_on_days=json.dumps(days))
        )

    # Drop the old columns
    with op.batch_alter_table('positionrequirement', schema=None) as batch_op:
        batch_op.drop_column('applies_weekdays')
        batch_op.drop_column('applies_weekends')


def downgrade() -> None:
    connection = op.get_bind()

    # Re-add the old columns
    with op.batch_alter_table('positionrequirement', schema=None) as batch_op:
        batch_op.add_column(sa.Column('applies_weekdays', sa.Boolean(), server_default=sa.text('1'), nullable=False))
        batch_op.add_column(sa.Column('applies_weekends', sa.Boolean(), server_default=sa.text('1'), nullable=False))

    # Define the temporary table representation for rollback
    positionrequirement = sa.table(
        'positionrequirement',
        sa.column('id', sa.Integer),
        sa.column('applies_weekdays', sa.Boolean),
        sa.column('applies_weekends', sa.Boolean),
        sa.column('applies_on_days', sa.JSON)
    )

    # Fetch data to rollback
    results = connection.execute(
        sa.select(
            positionrequirement.c.id,
            positionrequirement.c.applies_on_days
        )
    ).fetchall()

    # Revert the data back to booleans
    for row in results:
        req_id = row.id

        # safely parse JSON, defaulting to empty list if None
        days = []
        if row.applies_on_days:
            # Handle string vs already-parsed list depending on the DB driver
            days = json.loads(row.applies_on_days) if isinstance(row.applies_on_days, str) else row.applies_on_days

        # Check if weekday/weekend integers are in the array
        has_weekdays = any(d in days for d in [0, 1, 2, 3, 4])
        has_weekends = any(d in days for d in [5, 6])

        connection.execute(
            positionrequirement.update()
            .where(positionrequirement.c.id == req_id)
            .values(
                applies_weekdays=has_weekdays,
                applies_weekends=has_weekends
            )
        )

    # Drop the new columns
    with op.batch_alter_table('positionrequirement', schema=None) as batch_op:
        batch_op.drop_column('applies_on_days')
        batch_op.drop_column('is_fixed')