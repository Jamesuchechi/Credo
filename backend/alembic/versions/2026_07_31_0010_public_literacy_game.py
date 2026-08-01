"""create quiz_items table for public literacy game

Revision ID: 2026_07_31_0010
Revises: 2026_07_31_0009
Create Date: 2026-07-31 16:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2026_07_31_0010'
down_revision: Union[str, None] = '2026_07_31_0009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'quiz_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('content_items.id', ondelete='SET NULL'), nullable=True),
        sa.Column('redacted_claim_text', sa.Text(), nullable=False),
        sa.Column('correct_verdict', sa.String(length=50), nullable=False),
        sa.Column('explanation_summary', sa.Text(), nullable=False),
        sa.Column('difficulty_tag', sa.String(length=20), nullable=False, server_default='medium'),
        sa.Column('is_approved', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('times_played', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('times_correct', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_quiz_items_is_approved', 'quiz_items', ['is_approved'])
    op.create_index('ix_quiz_items_difficulty_tag', 'quiz_items', ['difficulty_tag'])


def downgrade() -> None:
    op.drop_index('ix_quiz_items_difficulty_tag', table_name='quiz_items')
    op.drop_index('ix_quiz_items_is_approved', table_name='quiz_items')
    op.drop_table('quiz_items')
