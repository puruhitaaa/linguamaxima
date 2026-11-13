"""add_learning_journeys

Revision ID: b7c9d2e1f403
Revises: a23bc891f421
Create Date: 2026-11-14 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7c9d2e1f403"
down_revision: Union[str, None] = "a23bc891f421"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "stories",
        sa.Column("is_journey_story", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(op.f("ix_stories_is_journey_story"), "stories", ["is_journey_story"], unique=False)

    op.create_table(
        "learning_journeys",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("language_pair_id", sa.Integer(), nullable=True),
        sa.Column(
            "cefr_level",
            sa.Enum("A1", "A2", "B1", "B2", "C1", "C2", name="cefrlevel", native_enum=False),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("purpose_input", sa.Text(), nullable=False),
        sa.Column("clarifications_json", sa.JSON(), nullable=True),
        sa.Column("synthesized_prompt", sa.Text(), nullable=False),
        sa.Column("sector_tag", sa.String(length=120), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("not_started", "in_progress", "completed", "paused", name="journeystatus", native_enum=False),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("total_steps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_steps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ai_model", sa.String(length=100), nullable=True),
        sa.Column("ai_provider", sa.String(length=50), nullable=True),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["language_pair_id"], ["language_pairs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_learning_journeys_id"), "learning_journeys", ["id"], unique=False)
    op.create_index(op.f("ix_learning_journeys_language_pair_id"), "learning_journeys", ["language_pair_id"], unique=False)
    op.create_index(op.f("ix_learning_journeys_cefr_level"), "learning_journeys", ["cefr_level"], unique=False)
    op.create_index(op.f("ix_learning_journeys_sector_tag"), "learning_journeys", ["sector_tag"], unique=False)
    op.create_index(op.f("ix_learning_journeys_status"), "learning_journeys", ["status"], unique=False)
    op.create_index(op.f("ix_learning_journeys_is_pinned"), "learning_journeys", ["is_pinned"], unique=False)
    op.create_index(op.f("ix_learning_journeys_last_accessed_at"), "learning_journeys", ["last_accessed_at"], unique=False)
    op.create_index(op.f("ix_learning_journeys_created_at"), "learning_journeys", ["created_at"], unique=False)

    op.create_table(
        "journey_phases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("journey_id", sa.Integer(), nullable=False),
        sa.Column("phase_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=250), nullable=False),
        sa.Column("title_translated", sa.String(length=250), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("milestone_goal", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["journey_id"], ["learning_journeys.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_journey_phases_id"), "journey_phases", ["id"], unique=False)
    op.create_index(op.f("ix_journey_phases_journey_id"), "journey_phases", ["journey_id"], unique=False)

    op.create_table(
        "journey_steps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phase_id", sa.Integer(), nullable=False),
        sa.Column("journey_id", sa.Integer(), nullable=False),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column(
            "step_type",
            sa.Enum("vocab_pack", "story_lesson", "checkpoint", name="journeysteptype", native_enum=False),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=250), nullable=False),
        sa.Column("title_translated", sa.String(length=250), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("grammar_focus", sa.String(length=250), nullable=True),
        sa.Column("story_topic_prompt", sa.Text(), nullable=True),
        sa.Column("story_type", sa.String(length=30), nullable=True),
        sa.Column("story_id", sa.Integer(), nullable=True),
        sa.Column("checkpoint_questions_json", sa.JSON(), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("best_score", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["journey_id"], ["learning_journeys.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["phase_id"], ["journey_phases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["story_id"], ["stories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_journey_steps_id"), "journey_steps", ["id"], unique=False)
    op.create_index(op.f("ix_journey_steps_phase_id"), "journey_steps", ["phase_id"], unique=False)
    op.create_index(op.f("ix_journey_steps_journey_id"), "journey_steps", ["journey_id"], unique=False)
    op.create_index(op.f("ix_journey_steps_story_id"), "journey_steps", ["story_id"], unique=False)
    op.create_index(op.f("ix_journey_steps_is_completed"), "journey_steps", ["is_completed"], unique=False)

    op.create_table(
        "journey_vocabularies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("journey_id", sa.Integer(), nullable=False),
        sa.Column("step_id", sa.Integer(), nullable=False),
        sa.Column("word", sa.String(length=200), nullable=False),
        sa.Column("translation", sa.String(length=250), nullable=False),
        sa.Column("part_of_speech", sa.String(length=50), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("phonetic", sa.String(length=120), nullable=True),
        sa.Column("example_sentence", sa.Text(), nullable=True),
        sa.Column("example_translation", sa.Text(), nullable=True),
        sa.Column("pronunciation_url", sa.String(length=500), nullable=True),
        sa.Column("is_mastered", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["journey_id"], ["learning_journeys.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["step_id"], ["journey_steps.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_journey_vocabularies_id"), "journey_vocabularies", ["id"], unique=False)
    op.create_index(op.f("ix_journey_vocabularies_journey_id"), "journey_vocabularies", ["journey_id"], unique=False)
    op.create_index(op.f("ix_journey_vocabularies_step_id"), "journey_vocabularies", ["step_id"], unique=False)
    op.create_index(op.f("ix_journey_vocabularies_word"), "journey_vocabularies", ["word"], unique=False)

    op.add_column("flashcards", sa.Column("journey_vocabulary_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_flashcards_journey_vocabulary_id",
        "flashcards",
        "journey_vocabularies",
        ["journey_vocabulary_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(op.f("ix_flashcards_journey_vocabulary_id"), "flashcards", ["journey_vocabulary_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_flashcards_journey_vocabulary_id"), table_name="flashcards")
    op.drop_constraint("fk_flashcards_journey_vocabulary_id", "flashcards", type_="foreignkey")
    op.drop_column("flashcards", "journey_vocabulary_id")

    op.drop_index(op.f("ix_journey_vocabularies_word"), table_name="journey_vocabularies")
    op.drop_index(op.f("ix_journey_vocabularies_step_id"), table_name="journey_vocabularies")
    op.drop_index(op.f("ix_journey_vocabularies_journey_id"), table_name="journey_vocabularies")
    op.drop_index(op.f("ix_journey_vocabularies_id"), table_name="journey_vocabularies")
    op.drop_table("journey_vocabularies")

    op.drop_index(op.f("ix_journey_steps_is_completed"), table_name="journey_steps")
    op.drop_index(op.f("ix_journey_steps_story_id"), table_name="journey_steps")
    op.drop_index(op.f("ix_journey_steps_journey_id"), table_name="journey_steps")
    op.drop_index(op.f("ix_journey_steps_phase_id"), table_name="journey_steps")
    op.drop_index(op.f("ix_journey_steps_id"), table_name="journey_steps")
    op.drop_table("journey_steps")

    op.drop_index(op.f("ix_journey_phases_journey_id"), table_name="journey_phases")
    op.drop_index(op.f("ix_journey_phases_id"), table_name="journey_phases")
    op.drop_table("journey_phases")

    op.drop_index(op.f("ix_learning_journeys_created_at"), table_name="learning_journeys")
    op.drop_index(op.f("ix_learning_journeys_last_accessed_at"), table_name="learning_journeys")
    op.drop_index(op.f("ix_learning_journeys_is_pinned"), table_name="learning_journeys")
    op.drop_index(op.f("ix_learning_journeys_status"), table_name="learning_journeys")
    op.drop_index(op.f("ix_learning_journeys_sector_tag"), table_name="learning_journeys")
    op.drop_index(op.f("ix_learning_journeys_cefr_level"), table_name="learning_journeys")
    op.drop_index(op.f("ix_learning_journeys_language_pair_id"), table_name="learning_journeys")
    op.drop_index(op.f("ix_learning_journeys_id"), table_name="learning_journeys")
    op.drop_table("learning_journeys")

    op.drop_index(op.f("ix_stories_is_journey_story"), table_name="stories")
    op.drop_column("stories", "is_journey_story")
