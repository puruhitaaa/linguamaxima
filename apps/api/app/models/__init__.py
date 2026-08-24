from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class CEFRLevel(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"

class Language(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    native_name = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class LanguagePair(Base):
    __tablename__ = "language_pairs"

    id = Column(Integer, primary_key=True, index=True)
    origin_language_id = Column(Integer, ForeignKey("languages.id", ondelete="CASCADE"), nullable=False)
    target_language_id = Column(Integer, ForeignKey("languages.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("origin_language_id", "target_language_id", name="uq_origin_target_pair"),
    )

    origin_language = relationship("Language", foreign_keys=[origin_language_id], lazy="joined")
    target_language = relationship("Language", foreign_keys=[target_language_id], lazy="joined")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    icon = Column(String(50), nullable=True)

class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    language_pair_id = Column(Integer, ForeignKey("language_pairs.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    cefr_level = Column(Enum(CEFRLevel, native_enum=False), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    title_translated = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    content_translated = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    audio_url = Column(String(500), nullable=True)
    estimated_reading_minutes = Column(Integer, default=3)
    word_count = Column(Integer, default=0)
    ai_model = Column(String(100), nullable=True)
    ai_provider = Column(String(50), nullable=True)
    is_published = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    language_pair = relationship("LanguagePair", lazy="joined")
    category = relationship("Category", lazy="joined")
    vocabulary = relationship("Vocabulary", back_populates="story", cascade="all, delete-orphan", lazy="selectin")
    grammar_tips = relationship("GrammarTip", back_populates="story", cascade="all, delete-orphan", lazy="selectin", order_by="GrammarTip.sort_order")
    quizzes = relationship("Quiz", back_populates="story", cascade="all, delete-orphan", lazy="selectin", order_by="Quiz.sort_order")
    progress = relationship("UserProgress", back_populates="story", cascade="all, delete-orphan", lazy="selectin")

class Vocabulary(Base):
    __tablename__ = "vocabulary"

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    word = Column(String(200), nullable=False, index=True)
    translation = Column(String(200), nullable=False)
    part_of_speech = Column(String(50), nullable=True)
    gender = Column(String(20), nullable=True)
    example_sentence = Column(Text, nullable=True)
    example_translation = Column(Text, nullable=True)
    pronunciation_url = Column(String(500), nullable=True)
    difficulty_rank = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    story = relationship("Story", back_populates="vocabulary")
    flashcards = relationship("Flashcard", back_populates="vocabulary", cascade="all, delete-orphan")

class GrammarTip(Base):
    __tablename__ = "grammar_tips"

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    explanation = Column(Text, nullable=False)
    explanation_translated = Column(Text, nullable=True)
    example = Column(Text, nullable=True)
    example_translation = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)

    story = relationship("Story", back_populates="grammar_tips")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    question_type = Column(String(50), nullable=False)  # multiple_choice, article, fill_blank, true_false
    question = Column(Text, nullable=False)
    question_translated = Column(Text, nullable=True)
    correct_answer = Column(Text, nullable=False)
    wrong_answers = Column(JSON, nullable=True)
    explanation = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)

    story = relationship("Story", back_populates="quizzes")

class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    quiz_score = Column(Integer, nullable=True)  # Percentage 0-100
    quiz_attempts = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False, index=True)
    last_accessed_at = Column(DateTime(timezone=True), default=utcnow)

    story = relationship("Story", back_populates="progress")

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    vocabulary_id = Column(Integer, ForeignKey("vocabulary.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=0)
    repetitions = Column(Integer, default=0)
    next_review = Column(DateTime(timezone=True), default=utcnow, index=True)
    last_reviewed = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    vocabulary = relationship("Vocabulary", back_populates="flashcards", lazy="joined")
