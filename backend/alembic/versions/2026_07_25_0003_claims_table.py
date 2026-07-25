"""Create claims table

Revision ID: 2026_07_25_0003
Revises: 2026_07_25_0002
Create Date: 2026-07-25 00:02:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '2026_07_25_0003'
down_revision: str | None = '2026_07_25_0002'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'claims',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('content_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('claim_text', sa.Text(), nullable=False),
        sa.Column('extracted_speaker', sa.String(length=255), nullable=True),
        sa.Column('verdict', sa.String(length=50), nullable=False, server_default='unverified'),
        sa.Column('confidence_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('evidence_summary', sa.Text(), nullable=False, server_default=''),
        sa.Column('reasoning_chain', postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), 'sqlite'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('ttl_expires_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_claims_content_item_id'), 'claims', ['content_item_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_claims_content_item_id'), table_name='claims')
    op.drop_table('claims')
