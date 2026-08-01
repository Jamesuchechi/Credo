"""Create credibility_receipts table

Revision ID: 2026_07_31_0007
Revises: 2026_07_31_0006
Create Date: 2026-07-31 16:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '2026_07_31_0007'
down_revision: str | None = '2026_07_31_0006'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'credibility_receipts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('content_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('public_slug', sa.String(length=32), nullable=False),
        sa.Column('verdict_summary', postgresql.JSONB().with_variant(sa.JSON(), 'sqlite'), nullable=False),
        sa.Column('signature', sa.String(length=255), nullable=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_slug', name='uq_credibility_receipts_public_slug')
    )
    op.create_index(op.f('ix_credibility_receipts_content_item_id'), 'credibility_receipts', ['content_item_id'], unique=False)
    op.create_index(op.f('ix_credibility_receipts_public_slug'), 'credibility_receipts', ['public_slug'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_credibility_receipts_public_slug'), table_name='credibility_receipts')
    op.drop_index(op.f('ix_credibility_receipts_content_item_id'), table_name='credibility_receipts')
    op.drop_table('credibility_receipts')
