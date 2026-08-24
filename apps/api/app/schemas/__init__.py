from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, Field
from app.models import CEFRLevel

# ----------------- Base / Common -----------------
class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ----------------- Languages -----------------
class LanguageResponse(ORMModel):
    id: int
    code: str
    name: str
    native_name: Optional[str] = None

class LanguagePairResponse(ORMModel):
    id: int
    origin_language: LanguageResponse
    target_language: LanguageResponse
    is_active: bool

# ----------------- Categories -----------------
class CategoryResponse(ORMModel):
    id: int
    name: str
    slug: str
    icon: Optional[str] = None

# ----------------- Vocabulary -----------------
class VocabularyBase(BaseModel):
    word: str
    translation: str
    part_of_speech: Optional[str] = None
    gender: Optional[str] = None
    example_sentence: Optional[str] = None
    example_translation: Optional[str] = None
    pronunciation_url: Optional[str] = None
    difficulty_rank: int = 1

class VocabularyResponse(VocabularyBase, ORMModel):
    id: int
    story_id: int
    is_saved_as_flashcard: Optional[bool] = False

# ----------------- Grammar Tips -----------------
class GrammarTipBase(BaseModel):
    title: str
    explanation: str
    explanation_translated: Optional[str] = None
    example: Optional[str] = None
    example_translation: Optional[str] = None
    sort_order: int = 0

class GrammarTipResponse(GrammarTipBase, ORMModel):
    id: int
    story_id: int

# ----------------- Quizzes -----------------
class QuizBase(BaseModel):
    question_type: str
    question: str
    question_translated: Optional[str] = None
    correct_answer: str
    wrong_answers: Optional[List[str]] = Field(default_factory=list)
    explanation: Optional[str] = None
    sort_order: int = 0

class QuizResponse(ORMModel):
    id: int
    story_id: int
    question_type: str
    question: str
    question_translated: Optional[str] = None
    options: List[str] = Field(default_factory=list)
    explanation: Optional[str] = None
    sort_order: int = 0

class QuizSubmissionItem(BaseModel):
    question_id: int
    selected_answer: str

class QuizSubmissionRequest(BaseModel):
    answers: List[QuizSubmissionItem]

class QuestionResult(BaseModel):
    question_id: int
    question: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str] = None

class QuizSubmissionResponse(BaseModel):
    story_id: int
    total_questions: int
    correct_answers: int
    score_percentage: int
    passed: bool
    results: List[QuestionResult]

# ----------------- Progress -----------------
class UserProgressResponse(ORMModel):
    id: int
    story_id: int
    completed_at: Optional[datetime] = None
    quiz_score: Optional[int] = None
    quiz_attempts: int = 0
    is_favorite: bool = False
    last_accessed_at: Optional[datetime] = None

class ProgressSummaryResponse(BaseModel):
    total_stories_read: int
    total_stories_available: int
    total_words_learned: int
    flashcards_due_today: int
    current_streak_days: int
    average_quiz_score: float

class FavoriteToggleResponse(BaseModel):
    story_id: int
    is_favorite: bool

# ----------------- Flashcards -----------------
class FlashcardResponse(ORMModel):
    id: int
    vocabulary_id: int
    vocabulary: VocabularyResponse
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review: datetime
    last_reviewed: Optional[datetime] = None
    created_at: datetime

class FlashcardCreateRequest(BaseModel):
    vocabulary_id: int

class FlashcardReviewRequest(BaseModel):
    # Quality rating: 0 (Again/Blackout), 3 (Hard), 4 (Good), 5 (Easy)
    quality: int = Field(ge=0, le=5)

class FlashcardReviewResponse(BaseModel):
    id: int
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review: datetime
    message: str

# ----------------- Stories -----------------
class StoryListItemResponse(ORMModel):
    id: int
    title: str
    title_translated: Optional[str] = None
    summary: Optional[str] = None
    cefr_level: CEFRLevel
    category: Optional[CategoryResponse] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    estimated_reading_minutes: int
    word_count: int
    is_favorite: bool = False
    is_completed: bool = False
    quiz_score: Optional[int] = None
    created_at: datetime

class StoryDetailResponse(ORMModel):
    id: int
    title: str
    title_translated: Optional[str] = None
    content: str
    content_translated: Optional[str] = None
    summary: Optional[str] = None
    cefr_level: CEFRLevel
    category: Optional[CategoryResponse] = None
    language_pair: Optional[LanguagePairResponse] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    estimated_reading_minutes: int
    word_count: int
    ai_model: Optional[str] = None
    ai_provider: Optional[str] = None
    is_favorite: bool = False
    is_completed: bool = False
    quiz_score: Optional[int] = None
    vocabulary: List[VocabularyResponse] = Field(default_factory=list)
    grammar_tips: List[GrammarTipResponse] = Field(default_factory=list)
    quizzes: List[QuizResponse] = Field(default_factory=list)
    created_at: datetime

class StoryGenerateRequest(BaseModel):
    cefr_level: CEFRLevel = CEFRLevel.A1
    category_slug: str = "travel"
    topic_hint: Optional[str] = None
    target_language_code: str = "de"
    origin_language_code: str = "id"

# ----------------- AI Structured Output Schemas -----------------
class GeneratedVocabularyItem(BaseModel):
    word: str
    translation: str
    part_of_speech: Optional[str] = "noun"
    gender: Optional[str] = None  # "der", "die", "das" for German nouns
    example_sentence: Optional[str] = None
    example_translation: Optional[str] = None
    difficulty_rank: int = 1

class GeneratedGrammarTip(BaseModel):
    title: str
    explanation: str
    explanation_translated: Optional[str] = None
    example: Optional[str] = None
    example_translation: Optional[str] = None

class GeneratedQuizQuestion(BaseModel):
    question_type: str = "multiple_choice"  # multiple_choice, article, fill_blank, true_false
    question: str
    question_translated: Optional[str] = None
    correct_answer: str
    wrong_answers: List[str] = Field(default_factory=list)
    explanation: Optional[str] = None

class GeneratedStoryBundle(BaseModel):
    title: str
    title_translated: str
    content: str
    content_translated: str
    summary: str
    vocabulary: List[GeneratedVocabularyItem] = Field(default_factory=list)
    grammar_tips: List[GeneratedGrammarTip] = Field(default_factory=list)
    quiz_questions: List[GeneratedQuizQuestion] = Field(default_factory=list)
