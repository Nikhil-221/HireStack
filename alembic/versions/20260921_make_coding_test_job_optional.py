"""make coding test job optional

Revision ID: 20260921_coding_test_job_optional
Revises: 20260907_coding_invite_opened_at
Create Date: 2026-09-21

"""
from alembic import op
import sqlalchemy as sa


revision = "20260921_test_job_nullable"
down_revision = "20260907_coding_invite_opened_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "coding_tests",
        "job_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "coding_tests",
        "job_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
