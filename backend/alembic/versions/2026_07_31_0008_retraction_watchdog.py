"""Create cited_sources and content_item_cited_sources tables, and add flagged source fields to content_items

Revision ID: 2026_07_31_0008
Revises: 2026_07_31_0007
Create Date: 2026-07-31 16:40:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '2026_07_31_0008'
down_revision: str | None = '2026_07_31_0007'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'cited_sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=False),
        sa.Column('content_hash_at_citation', sa.String(length=64), nullable=False),
        sa.Column('first_cited_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_checked_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('update_notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_url', name='uq_cited_sources_source_url')
    )
    op.create_index(op.f('ix_cited_sources_source_url'), 'cited_sources', ['source_url'], unique=True)
    op.create_index(op.f('ix_cited_sources_status'), 'cited_sources', ['status'], unique=False)

    op.create_table(
        'content_item_cited_sources',
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('content_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('cited_source_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cited_sources.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('content_item_id', 'cited_source_id')
    )

    op.add_column('content_items', sa.Column('has_flagged_source_update', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('content_items', sa.Column('source_update_notice', sa.Text(), nullable=True))
    op.create_index(op.f('ix_content_items_has_flagged_source_update'), 'content_items', ['has_flagged_source_update'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_content_items_has_flagged_source_update'), table_name='content_items')
    op.drop_column('content_items', 'source_update_notice')
    op.drop_column('content_items', 'has_flagged_source_update')
    op.drop_table('content_item_cited_sources')
    op.drop_index(op.f('ix_cited_sources_status'), table_name='cited_sources')
    op.drop_index(op.f('ix_cited_sources_source_url'), table_name='cited_sources')
    op.drop_table('cited_sources')
