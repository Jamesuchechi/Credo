"""Add pgvector extension and embedding column to claims table

Revision ID: 2026_07_31_0006
Revises: 2026_07_31_0005
Create Date: 2026-07-31 12:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '2026_07_31_0006'
down_revision: str | None = '2026_07_31_0005'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute('CREATE EXTENSION IF NOT EXISTS vector;')
        op.execute('ALTER TABLE claims ADD COLUMN IF NOT EXISTS embedding vector(384);')
    else:
        with op.batch_alter_table('claims') as batch_op:
            batch_op.add_column(sa.Column('embedding', postgresql.JSONB().with_variant(sa.JSON(), 'sqlite'), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute('ALTER TABLE claims DROP COLUMN IF EXISTS embedding;')
    else:
        with op.batch_alter_table('claims') as batch_op:
            batch_op.drop_column('embedding')
