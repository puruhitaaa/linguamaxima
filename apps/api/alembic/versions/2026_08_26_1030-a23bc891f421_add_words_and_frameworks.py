"""add_words_and_frameworks

Revision ID: a23bc891f421
Revises: 16b64a8457e2
Create Date: 2026-08-26 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a23bc891f421'
down_revision: Union[str, None] = '16b64a8457e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add proficiency_framework to languages
    op.add_column(
        'languages',
        sa.Column(
            'proficiency_framework',
            sa.Enum('cefr', 'jlpt', 'hsk', 'bipa', 'torfl', 'frequency', name='proficiencyframework', native_enum=False),
            nullable=False,
            server_default='cefr'
        )
    )

    # 2. Create words table
    op.create_table(
        'words',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('language_id', sa.Integer(), nullable=False),
        sa.Column('lemma', sa.String(length=200), nullable=False),
        sa.Column('normalized_level', sa.Enum('A1', 'A2', 'B1', 'B2', 'C1', 'C2', name='cefrlevel', native_enum=False), nullable=False),
        sa.Column('native_level', sa.String(length=50), nullable=True),
        sa.Column('part_of_speech', sa.String(length=50), nullable=False),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('phonetic', sa.String(length=100), nullable=True),
        sa.Column('translation', sa.Text(), nullable=False),
        sa.Column('definition', sa.Text(), nullable=True),
        sa.Column('example_sentence', sa.Text(), nullable=True),
        sa.Column('example_translation', sa.Text(), nullable=True),
        sa.Column('audio_url', sa.String(length=500), nullable=True),
        sa.Column('frequency_rank', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['language_id'], ['languages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_words_id'), 'words', ['id'], unique=False)
    op.create_index(op.f('ix_words_language_id'), 'words', ['language_id'], unique=False)
    op.create_index(op.f('ix_words_lemma'), 'words', ['lemma'], unique=False)
    op.create_index(op.f('ix_words_normalized_level'), 'words', ['normalized_level'], unique=False)
    op.create_index(op.f('ix_words_part_of_speech'), 'words', ['part_of_speech'], unique=False)

    # 3. Update flashcards to support word_id and nullable vocabulary_id
    op.alter_column('flashcards', 'vocabulary_id', existing_type=sa.Integer(), nullable=True)
    op.add_column('flashcards', sa.Column('word_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_flashcards_word_id', 'flashcards', 'words', ['word_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_flashcards_word_id'), 'flashcards', ['word_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_flashcards_word_id'), table_name='flashcards')
    op.drop_constraint('fk_flashcards_word_id', 'flashcards', type_='foreignkey')
    op.drop_column('flashcards', 'word_id')
    op.alter_column('flashcards', 'vocabulary_id', existing_type=sa.Integer(), nullable=False)

    op.drop_index(op.f('ix_words_part_of_speech'), table_name='words')
    op.drop_index(op.f('ix_words_normalized_level'), table_name='words')
    op.drop_index(op.f('ix_words_lemma'), table_name='words')
    op.drop_index(op.f('ix_words_language_id'), table_name='words')
    op.drop_index(op.f('ix_words_id'), table_name='words')
    op.drop_table('words')

    op.drop_column('languages', 'proficiency_framework')
