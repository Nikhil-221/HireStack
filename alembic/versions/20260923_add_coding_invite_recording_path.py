"""add coding invite recording path

Revision ID: 20260923_coding_invite_recording_path
Revises: 20260921_test_job_nullable
Create Date: 2026-09-23

"""

from alembic import op


revision = "20260923_coding_invite_recording_path"
down_revision = "20260921_test_job_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE coding_test_invites "
        "ADD COLUMN IF NOT EXISTS recording_path VARCHAR"
    )


def downgrade() -> None:
    op.drop_column("coding_test_invites", "recording_path")