"""create orders

Revision ID: a1b2c3d4e5f6
Revises: 3b60a7877631
Create Date: 2026-09-21

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "3b60a7877631"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("seller_id", sa.Integer(), nullable=False),
        sa.Column("buyer_id", sa.Integer(), nullable=False),
        sa.Column("amount_cop", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("purge_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["buyer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_orders_seller_id"), "orders", ["seller_id"])
    op.create_index(op.f("ix_orders_buyer_id"), "orders", ["buyer_id"])
    op.create_index(op.f("ix_orders_state"), "orders", ["state"])

    op.create_table(
        "order_files",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("stored_name", sa.String(length=64), nullable=False),
        sa.Column("extension", sa.String(length=16), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_order_files_order_id"), "order_files", ["order_id"])


def downgrade() -> None:
    # El orden importa: order_files referencia orders.
    op.drop_index(op.f("ix_order_files_order_id"), table_name="order_files")
    op.drop_table("order_files")
    op.drop_index(op.f("ix_orders_state"), table_name="orders")
    op.drop_index(op.f("ix_orders_buyer_id"), table_name="orders")
    op.drop_index(op.f("ix_orders_seller_id"), table_name="orders")
    op.drop_table("orders")
