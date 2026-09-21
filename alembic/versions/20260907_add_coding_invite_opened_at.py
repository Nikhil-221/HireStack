"""add coding invite opened timestamp

Revision ID: 20260907_coding_invite_opened_at
Revises: 77d71531fc36
Create Date: 2026-09-07

"""

from alembic import op
import sqlalchemy as sa


revision = "20260907_coding_invite_opened_at"
down_revision = "77d71531fc36"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE coding_test_invites "
        "ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE"
    )


def downgrade() -> None:
    op.drop_column("coding_test_invites", "opened_at")