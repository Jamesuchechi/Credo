"""Add parent_claim_id and mutation_score to claims table for Feature A

Revision ID: 2026_07_31_0009
Revises: 2026_07_31_0008
Create Date: 2026-07-31 16:45:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '2026_07_31_0009'
down_revision: str | None = '2026_07_31_0008'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('claims', sa.Column('parent_claim_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('claims.id', ondelete='SET NULL'), nullable=True))
    op.add_column('claims', sa.Column('mutation_score', sa.Float(), nullable=True))
    op.create_index(op.f('ix_claims_parent_claim_id'), 'claims', ['parent_claim_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_claims_parent_claim_id'), table_name='claims')
    op.drop_column('claims', 'mutation_score')
    op.drop_column('claims', 'parent_claim_id')
