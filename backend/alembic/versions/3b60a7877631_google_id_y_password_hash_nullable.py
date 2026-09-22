"""google_id y password_hash nullable

Revision ID: 3b60a7877631
Revises: f85e9c73c76e
Create Date: 2026-09-21 19:38:23.283261

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b60a7877631'
down_revision: Union[str, Sequence[str], None] = 'f85e9c73c76e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite no soporta ALTER COLUMN directo; batch_alter_table recrea la tabla.
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('google_id', sa.String(length=64), nullable=True))
        batch_op.alter_column('password_hash',
                   existing_type=sa.VARCHAR(length=255),
                   nullable=True)
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)


def downgrade() -> None:
    # El orden importa: batch_alter_table RECREA la tabla, así que el índice y la columna
    # deben soltarse ANTES. Ponerlos dentro o después del batch falla con
    # "no such index: ix_users_google_id" (reproducido).
    op.drop_index(op.f("ix_users_google_id"), table_name="users")
    op.drop_column("users", "google_id")
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "password_hash", existing_type=sa.VARCHAR(length=255), nullable=False
        )
