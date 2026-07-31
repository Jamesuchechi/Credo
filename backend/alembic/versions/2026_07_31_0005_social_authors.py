"""Create social_authors table and link to content_items

Revision ID: 2026_07_31_0005
Revises: 2026_07_25_0004
Create Date: 2026-07-31 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '2026_07_31_0005'
down_revision: str | None = '2026_07_25_0004'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'social_authors',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('handle', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=True),
        sa.Column('verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('follower_count', sa.Integer(), nullable=True),
        sa.Column('account_created_at', sa.DateTime(), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('platform', 'handle', name='uq_social_authors_platform_handle')
    )
    op.create_index(op.f('ix_social_authors_platform'), 'social_authors', ['platform'], unique=False)
    op.create_index(op.f('ix_social_authors_handle'), 'social_authors', ['handle'], unique=False)

    op.add_column(
        'content_items',
        sa.Column(
            'social_author_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('social_authors.id', ondelete='SET NULL'),
            nullable=True,
        )
    )
    op.create_index(op.f('ix_content_items_social_author_id'), 'content_items', ['social_author_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_content_items_social_author_id'), table_name='content_items')
    op.drop_column('content_items', 'social_author_id')
    op.drop_index(op.f('ix_social_authors_handle'), table_name='social_authors')
    op.drop_index(op.f('ix_social_authors_platform'), table_name='social_authors')
    op.drop_table('social_authors')
