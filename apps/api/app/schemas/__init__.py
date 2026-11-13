from datetime import datetime
from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel, ConfigDict, Field
from app.models import CEFRLevel, JourneyStatus, JourneyStepType, ProficiencyFramework

# ----------------- Base / Common -----------------
class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ----------------- Languages -----------------
class LanguageResponse(ORMModel):
    id: int
    code: str
    name: str
    native_name: Optional[str] = None
    proficiency_framework: ProficiencyFramework = ProficiencyFramework.CEFR

class LanguagePairResponse(ORMModel):
    id: int
    origin_language: LanguageResponse
    target_language: LanguageResponse
    is_active: bool

class LanguagePairCreateRequest(BaseModel):
    origin_language_code: str
    target_language_code: str

# ----------------- Categories -----------------
class CategoryResponse(ORMModel):
    id: int
    name: str
    slug: str
    icon: Optional[str] = None

# ----------------- Words / Dictionary -----------------
class WordBase(BaseModel):
    lemma: str
    normalized_level: CEFRLevel
    native_level: Optional[str] = None
    part_of_speech: str
    gender: Optional[str] = None
    phonetic: Optional[str] = None
    translation: str
    definition: Optional[str] = None
    example_sentence: Optional[str] = None
    example_translation: Optional[str] = None
    audio_url: Optional[str] = None
    frequency_rank: Optional[int] = None

class WordResponse(WordBase, ORMModel):
    id: int
    language_id: int
    is_saved_as_flashcard: Optional[bool] = False
    created_at: datetime

class WordListResponse(BaseModel):
    items: List[WordResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool = False
    has_prev: bool = False

class FilterCountItem(BaseModel):
    key: str
    label: str
    count: int

class WordFilterMetaResponse(BaseModel):
    language_code: str
    language_name: str
    proficiency_framework: ProficiencyFramework
    total_words: int
    levels: List[FilterCountItem]
    parts_of_speech: List[FilterCountItem]

class WordSaveFlashcardRequest(BaseModel):
    word_id: int

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
class JourneyVocabularyResponse(ORMModel):
    id: int
    journey_id: int
    step_id: int
    word: str
    translation: str
    part_of_speech: Optional[str] = None
    gender: Optional[str] = None
    phonetic: Optional[str] = None
    example_sentence: Optional[str] = None
    example_translation: Optional[str] = None
    pronunciation_url: Optional[str] = None
    is_mastered: bool = False
    is_saved_as_flashcard: bool = False

class FlashcardResponse(ORMModel):
    id: int
    vocabulary_id: Optional[int] = None
    vocabulary: Optional[VocabularyResponse] = None
    word_id: Optional[int] = None
    word: Optional[WordResponse] = None
    journey_vocabulary_id: Optional[int] = None
    journey_vocabulary: Optional[JourneyVocabularyResponse] = None
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review: datetime
    last_reviewed: Optional[datetime] = None
    created_at: datetime

class FlashcardCreateRequest(BaseModel):
    vocabulary_id: Optional[int] = None
    word_id: Optional[int] = None
    journey_vocabulary_id: Optional[int] = None

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
    language_pair: Optional[LanguagePairResponse] = None
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
    story_type: Optional[str] = "auto"  # "auto", "dialogue", "monologue"

# ----------------- AI Structured Output Schemas -----------------
class GeneratedVocabularyItem(BaseModel):
    word: str
    translation: str
    part_of_speech: Optional[str] = "noun"
    gender: Optional[str] = None  # "der", "die", "das" for German nouns
    example_sentence: Optional[str] = None
    example_translation: Optional[str] = None
    difficulty_rank: int = 1
    pronunciation_url: Optional[str] = None

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
    speaker_name: Optional[str] = None
    speaker_gender: Optional[str] = None  # "male", "female", or None
    content: str
    content_translated: str
    summary: str
    vocabulary: List[GeneratedVocabularyItem] = Field(default_factory=list)
    grammar_tips: List[GeneratedGrammarTip] = Field(default_factory=list)
    quiz_questions: List[GeneratedQuizQuestion] = Field(default_factory=list)

# ----------------- Learning Journeys -----------------
class ClarificationAnswerItem(BaseModel):
    question_id: str
    question: str
    answer: str

class ClarificationQuestionItem(BaseModel):
    id: str
    question: str
    hint: Optional[str] = None
    input_type: Literal["chips", "multi_chips", "text"] = "chips"
    suggested_options: List[str] = Field(default_factory=list)

class JourneyClarifyRequest(BaseModel):
    purpose: str = Field(min_length=2, max_length=500)
    origin_language_code: str = "id"
    target_language_code: str = "de"
    answers: List[ClarificationAnswerItem] = Field(default_factory=list)
    round: int = Field(default=1, ge=1, le=3)

class JourneyClarifyResponse(BaseModel):
    is_sufficient: bool
    confidence_reason: str
    questions: List[ClarificationQuestionItem] = Field(default_factory=list)
    draft_summary: str
    recommended_sector_tag: Optional[str] = None
    synthesized_prompt: Optional[str] = None

class JourneyPromptPreviewRequest(BaseModel):
    purpose: str = Field(min_length=2, max_length=500)
    clarifications: List[ClarificationAnswerItem] = Field(default_factory=list)
    cefr_level: CEFRLevel = CEFRLevel.B1
    origin_language_code: str = "id"
    target_language_code: str = "de"

class JourneyPromptPreviewResponse(BaseModel):
    synthesized_prompt: str
    summary: str
    recommended_sector_tag: Optional[str] = None
    estimated_phases: int = 3
    estimated_vocab_count: int = 24

class JourneyGenerateRequest(BaseModel):
    purpose: str = Field(min_length=2, max_length=500)
    clarifications: List[ClarificationAnswerItem] = Field(default_factory=list)
    cefr_level: CEFRLevel = CEFRLevel.B1
    origin_language_code: str = "id"
    target_language_code: str = "de"
    custom_prompt_override: Optional[str] = None

class CheckpointQuestionItem(BaseModel):
    id: str
    question_type: str = "multiple_choice"
    question: str
    question_translated: Optional[str] = None
    options: List[str] = Field(default_factory=list)
    explanation: Optional[str] = None

class JourneyStepResponse(ORMModel):
    id: int
    phase_id: int
    journey_id: int
    step_order: int
    step_type: JourneyStepType
    title: str
    title_translated: Optional[str] = None
    description: Optional[str] = None
    grammar_focus: Optional[str] = None
    story_type: Optional[str] = None
    story_id: Optional[int] = None
    is_story_prepared: bool = False
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    best_score: Optional[int] = None
    vocabularies: List[JourneyVocabularyResponse] = Field(default_factory=list)
    checkpoint_questions: List[CheckpointQuestionItem] = Field(default_factory=list)

class JourneyPhaseResponse(ORMModel):
    id: int
    journey_id: int
    phase_number: int
    title: str
    title_translated: Optional[str] = None
    description: Optional[str] = None
    milestone_goal: Optional[str] = None
    steps: List[JourneyStepResponse] = Field(default_factory=list)

class JourneyListItemResponse(ORMModel):
    id: int
    title: str
    purpose_input: str
    sector_tag: Optional[str] = None
    summary: Optional[str] = None
    cefr_level: CEFRLevel
    language_pair: Optional[LanguagePairResponse] = None
    status: JourneyStatus
    is_pinned: bool = False
    total_steps: int = 0
    completed_steps: int = 0
    progress_percentage: int = 0
    total_vocab_count: int = 0
    mastered_vocab_count: int = 0
    next_step_id: Optional[int] = None
    next_step_title: Optional[str] = None
    last_accessed_at: Optional[datetime] = None
    created_at: datetime

class JourneyDetailResponse(JourneyListItemResponse):
    clarifications: List[ClarificationAnswerItem] = Field(default_factory=list)
    synthesized_prompt: str
    ai_model: Optional[str] = None
    ai_provider: Optional[str] = None
    phases: List[JourneyPhaseResponse] = Field(default_factory=list)

class JourneyStepPrepareResponse(BaseModel):
    step: JourneyStepResponse
    story_id: Optional[int] = None
    newly_generated: bool = False

class CheckpointAnswerSubmission(BaseModel):
    question_id: str
    selected_answer: str

class JourneyStepCompleteRequest(BaseModel):
    quiz_answers: List[CheckpointAnswerSubmission] = Field(default_factory=list)

class CheckpointQuestionResult(BaseModel):
    question_id: str
    question: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str] = None

class JourneyStepCompleteResponse(BaseModel):
    step_id: int
    is_completed: bool
    score_percentage: Optional[int] = None
    passed: bool = True
    results: List[CheckpointQuestionResult] = Field(default_factory=list)
    journey_completed_steps: int
    journey_total_steps: int
    journey_status: JourneyStatus

class JourneyPinToggleResponse(BaseModel):
    journey_id: int
    is_pinned: bool

class JourneyBulkFlashcardResponse(BaseModel):
    saved_count: int
    already_saved_count: int
    flashcard_ids: List[int] = Field(default_factory=list)

# ----------------- AI Journey Structured Output Schemas -----------------
class GeneratedClarificationResult(BaseModel):
    is_sufficient: bool = False
    confidence_reason: str
    questions: List[ClarificationQuestionItem] = Field(default_factory=list)
    draft_summary: str
    recommended_sector_tag: Optional[str] = None
    synthesized_prompt: Optional[str] = None

class GeneratedPromptSynthesis(BaseModel):
    synthesized_prompt: str
    summary: str
    recommended_sector_tag: Optional[str] = None

class GeneratedJourneyVocabItem(BaseModel):
    word: str
    translation: str
    part_of_speech: Optional[str] = "noun"
    gender: Optional[str] = None
    phonetic: Optional[str] = None
    example_sentence: Optional[str] = None
    example_translation: Optional[str] = None

class GeneratedCheckpointQuestion(BaseModel):
    id: str
    question_type: str = "multiple_choice"
    question: str
    question_translated: Optional[str] = None
    correct_answer: str
    wrong_answers: List[str] = Field(default_factory=list)
    explanation: Optional[str] = None

class GeneratedJourneyStep(BaseModel):
    step_type: JourneyStepType
    title: str
    title_translated: Optional[str] = None
    description: Optional[str] = None
    grammar_focus: Optional[str] = None
    story_topic_prompt: Optional[str] = None
    story_type: Optional[str] = "dialogue"
    vocabularies: List[GeneratedJourneyVocabItem] = Field(default_factory=list)
    checkpoint_questions: List[GeneratedCheckpointQuestion] = Field(default_factory=list)

class GeneratedJourneyPhase(BaseModel):
    phase_number: int
    title: str
    title_translated: Optional[str] = None
    description: Optional[str] = None
    milestone_goal: Optional[str] = None
    steps: List[GeneratedJourneyStep] = Field(default_factory=list)

class GeneratedJourneyCurriculum(BaseModel):
    title: str
    sector_tag: Optional[str] = None
    summary: str
    phases: List[GeneratedJourneyPhase] = Field(default_factory=list)
