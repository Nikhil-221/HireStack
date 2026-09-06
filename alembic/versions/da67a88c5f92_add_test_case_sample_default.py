"""add test case sample default

Revision ID: da67a88c5f92
Revises: 782d7c6bdfbb
Create Date: 2026-09-06 19:50:45.134374

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'da67a88c5f92'
down_revision = '782d7c6bdfbb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "test_cases",
        "is_sample",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        server_default=sa.false(),
    )


def downgrade() -> None:
    op.alter_column(
        "test_cases",
        "is_sample",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        server_default=None,
    )
