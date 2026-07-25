"""Phase 1 database tables (sources, content_items, analysis_results)

Revision ID: 2026_07_25_0001
Revises: 
Create Date: 2026-07-25 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '2026_07_25_0001'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('historical_accuracy_score', sa.Float(), nullable=False, server_default='70.0'),
        sa.Column('bias_rating', sa.String(length=50), nullable=False, server_default='center'),
        sa.Column('whois_age_days', sa.Integer(), nullable=True, server_default='365'),
        sa.Column('is_known_satire', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_known_misinfo', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sources_domain'), 'sources', ['domain'], unique=True)

    op.create_table(
        'content_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('modality', sa.String(length=50), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('raw_payload', sa.Text(), nullable=False),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='queued'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_content_items_content_hash'), 'content_items', ['content_hash'], unique=False)
    op.create_index(op.f('ix_content_items_status'), 'content_items', ['status'], unique=False)

    op.create_table(
        'analysis_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('composite_score', sa.Float(), nullable=False),
        sa.Column('dimension_scores', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('reasoning_chain', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('corroborating_sources', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('model_version', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['content_item_id'], ['content_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('analysis_results')
    op.drop_index(op.f('ix_content_items_status'), table_name='content_items')
    op.drop_index(op.f('ix_content_items_content_hash'), table_name='content_items')
    op.drop_table('content_items')
    op.drop_index(op.f('ix_sources_domain'), table_name='sources')
    op.drop_table('sources')
