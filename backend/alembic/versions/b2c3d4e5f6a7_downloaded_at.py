"""orders.downloaded_at

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-22

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # `batch_alter_table` porque SQLite no soporta ALTER TABLE ADD COLUMN con todas las
    # variantes: alembic recrea la tabla por detrás.
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("downloaded_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch:
        batch.drop_column("downloaded_at")
