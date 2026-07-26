"""Add user_id to content_items

Revision ID: 2026_07_25_0004
Revises: 2026_07_25_0003
Create Date: 2026-07-26 11:52:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '2026_07_25_0004'
down_revision: str | None = '2026_07_25_0003'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'content_items',
        sa.Column(
            'user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id'),
            nullable=True,
        ),
    )
    op.create_index(op.f('ix_content_items_user_id'), 'content_items', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_content_items_user_id'), table_name='content_items')
    op.drop_column('content_items', 'user_id')