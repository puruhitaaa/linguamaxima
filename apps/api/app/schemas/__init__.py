from datetime import datetime
from typing import Literal

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
    native_name: str | None = None
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
    icon: str | None = None

# ----------------- Words / Dictionary -----------------
class WordBase(BaseModel):
    lemma: str
    normalized_level: CEFRLevel
    native_level: str | None = None
    part_of_speech: str
    gender: str | None = None
    phonetic: str | None = None
    translation: str
    definition: str | None = None
    example_sentence: str | None = None
    example_translation: str | None = None
    audio_url: str | None = None
    frequency_rank: int | None = None

class WordResponse(WordBase, ORMModel):
    id: int
    language_id: int
    is_saved_as_flashcard: bool | None = False
    created_at: datetime

class WordListResponse(BaseModel):
    items: list[WordResponse]
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
    levels: list[FilterCountItem]
    parts_of_speech: list[FilterCountItem]

class WordSaveFlashcardRequest(BaseModel):
    word_id: int

# ----------------- Vocabulary -----------------
class VocabularyBase(BaseModel):
    word: str
    translation: str
    part_of_speech: str | None = None
    gender: str | None = None
    example_sentence: str | None = None
    example_translation: str | None = None
    pronunciation_url: str | None = None
    difficulty_rank: int = 1

class VocabularyResponse(VocabularyBase, ORMModel):
    id: int
    story_id: int
    is_saved_as_flashcard: bool | None = False
    story_language_code: str | None = None

# ----------------- Grammar Tips -----------------
class GrammarTipBase(BaseModel):
    title: str
    explanation: str
    explanation_translated: str | None = None
    example: str | None = None
    example_translation: str | None = None
    sort_order: int = 0

class GrammarTipResponse(GrammarTipBase, ORMModel):
    id: int
    story_id: int

# ----------------- Quizzes -----------------
class QuizBase(BaseModel):
    question_type: str
    question: str
    question_translated: str | None = None
    correct_answer: str
    wrong_answers: list[str] | None = Field(default_factory=list)
    explanation: str | None = None
    sort_order: int = 0

class QuizResponse(ORMModel):
    id: int
    story_id: int
    question_type: str
    question: str
    question_translated: str | None = None
    options: list[str] = Field(default_factory=list)
    explanation: str | None = None
    sort_order: int = 0

class QuizSubmissionItem(BaseModel):
    question_id: int
    selected_answer: str

class QuizSubmissionRequest(BaseModel):
    answers: list[QuizSubmissionItem]

class QuestionResult(BaseModel):
    question_id: int
    question: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str | None = None

class QuizSubmissionResponse(BaseModel):
    story_id: int
    total_questions: int
    correct_answers: int
    score_percentage: int
    passed: bool
    results: list[QuestionResult]

# ----------------- Progress -----------------
class UserProgressResponse(ORMModel):
    id: int
    story_id: int
    completed_at: datetime | None = None
    quiz_score: int | None = None
    quiz_attempts: int = 0
    is_favorite: bool = False
    last_accessed_at: datetime | None = None

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

class StoryCompleteResponse(BaseModel):
    story_id: int
    is_completed: bool
    completed_at: datetime

# ----------------- Flashcards -----------------
class JourneyVocabularyResponse(ORMModel):
    id: int
    journey_id: int
    step_id: int
    word: str
    translation: str
    part_of_speech: str | None = None
    gender: str | None = None
    phonetic: str | None = None
    example_sentence: str | None = None
    example_translation: str | None = None
    pronunciation_url: str | None = None
    is_mastered: bool = False
    is_saved_as_flashcard: bool = False

class FlashcardResponse(ORMModel):
    id: int
    vocabulary_id: int | None = None
    vocabulary: VocabularyResponse | None = None
    word_id: int | None = None
    word: WordResponse | None = None
    journey_vocabulary_id: int | None = None
    journey_vocabulary: JourneyVocabularyResponse | None = None
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review: datetime
    last_reviewed: datetime | None = None
    created_at: datetime

class FlashcardCreateRequest(BaseModel):
    vocabulary_id: int | None = None
    word_id: int | None = None
    journey_vocabulary_id: int | None = None

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
    title_translated: str | None = None
    summary: str | None = None
    cefr_level: CEFRLevel
    category: CategoryResponse | None = None
    language_pair: LanguagePairResponse | None = None
    image_url: str | None = None
    audio_url: str | None = None
    estimated_reading_minutes: int
    word_count: int
    is_favorite: bool = False
    is_completed: bool = False
    quiz_score: int | None = None
    created_at: datetime

class StoryDetailResponse(ORMModel):
    id: int
    title: str
    title_translated: str | None = None
    content: str
    content_translated: str | None = None
    summary: str | None = None
    cefr_level: CEFRLevel
    category: CategoryResponse | None = None
    language_pair: LanguagePairResponse | None = None
    image_url: str | None = None
    audio_url: str | None = None
    estimated_reading_minutes: int
    word_count: int
    ai_model: str | None = None
    ai_provider: str | None = None
    is_favorite: bool = False
    is_completed: bool = False
    quiz_score: int | None = None
    vocabulary: list[VocabularyResponse] = Field(default_factory=list)
    grammar_tips: list[GrammarTipResponse] = Field(default_factory=list)
    quizzes: list[QuizResponse] = Field(default_factory=list)
    created_at: datetime

class StoryGenerateRequest(BaseModel):
    cefr_level: CEFRLevel = CEFRLevel.A1
    category_slug: str = "travel"
    topic_hint: str | None = Field(default=None, max_length=200)
    target_language_code: str = "de"
    origin_language_code: str = "id"
    story_type: str | None = "auto"  # "auto", "dialogue", "monologue"

# ----------------- AI Structured Output Schemas -----------------
class GeneratedVocabularyItem(BaseModel):
    word: str
    translation: str
    part_of_speech: str | None = "noun"
    gender: str | None = None  # "der", "die", "das" for German nouns
    example_sentence: str | None = None
    example_translation: str | None = None
    difficulty_rank: int = 1
    pronunciation_url: str | None = None

class GeneratedGrammarTip(BaseModel):
    title: str
    explanation: str
    explanation_translated: str | None = None
    example: str | None = None
    example_translation: str | None = None

class GeneratedQuizQuestion(BaseModel):
    question_type: str = "multiple_choice"  # multiple_choice, article, fill_blank, true_false
    question: str
    question_translated: str | None = None
    correct_answer: str
    wrong_answers: list[str] = Field(default_factory=list)
    explanation: str | None = None

class GeneratedStoryBundle(BaseModel):
    title: str
    title_translated: str
    speaker_name: str | None = None
    speaker_gender: str | None = None  # "male", "female", or None
    speaker_genders: dict[str, str] | None = None  # Optional {"Speaker": "male" | "female"} map for dialogues
    content: str
    content_translated: str
    summary: str
    vocabulary: list[GeneratedVocabularyItem] = Field(default_factory=list)
    grammar_tips: list[GeneratedGrammarTip] = Field(default_factory=list)
    quiz_questions: list[GeneratedQuizQuestion] = Field(default_factory=list)

# ----------------- Learning Journeys -----------------
class ClarificationAnswerItem(BaseModel):
    question_id: str
    question: str
    answer: str

class ClarificationQuestionItem(BaseModel):
    id: str
    question: str
    hint: str | None = None
    input_type: Literal["chips", "multi_chips", "text"] = "chips"
    suggested_options: list[str] = Field(default_factory=list)

class JourneyClarifyRequest(BaseModel):
    purpose: str = Field(min_length=2, max_length=500)
    origin_language_code: str = "id"
    target_language_code: str = "de"
    answers: list[ClarificationAnswerItem] = Field(default_factory=list)
    round: int = Field(default=1, ge=1, le=3)

class JourneyClarifyResponse(BaseModel):
    is_sufficient: bool
    confidence_reason: str
    questions: list[ClarificationQuestionItem] = Field(default_factory=list)
    draft_summary: str
    recommended_sector_tag: str | None = None
    synthesized_prompt: str | None = None

class JourneyPromptPreviewRequest(BaseModel):
    purpose: str = Field(min_length=2, max_length=500)
    clarifications: list[ClarificationAnswerItem] = Field(default_factory=list)
    cefr_level: CEFRLevel = CEFRLevel.B1
    origin_language_code: str = "id"
    target_language_code: str = "de"

class JourneyPromptPreviewResponse(BaseModel):
    synthesized_prompt: str
    summary: str
    recommended_sector_tag: str | None = None
    estimated_phases: int = 3
    estimated_vocab_count: int = 24

class JourneyGenerateRequest(BaseModel):
    purpose: str = Field(min_length=2, max_length=500)
    clarifications: list[ClarificationAnswerItem] = Field(default_factory=list)
    cefr_level: CEFRLevel = CEFRLevel.B1
    origin_language_code: str = "id"
    target_language_code: str = "de"
    custom_prompt_override: str | None = None

class CheckpointQuestionItem(BaseModel):
    id: str
    question_type: str = "multiple_choice"
    question: str
    question_translated: str | None = None
    options: list[str] = Field(default_factory=list)
    explanation: str | None = None

class JourneyStepResponse(ORMModel):
    id: int
    phase_id: int
    journey_id: int
    step_order: int
    step_type: JourneyStepType
    title: str
    title_translated: str | None = None
    description: str | None = None
    grammar_focus: str | None = None
    story_type: str | None = None
    story_id: int | None = None
    is_story_prepared: bool = False
    is_completed: bool = False
    completed_at: datetime | None = None
    best_score: int | None = None
    vocabularies: list[JourneyVocabularyResponse] = Field(default_factory=list)
    checkpoint_questions: list[CheckpointQuestionItem] = Field(default_factory=list)

class JourneyPhaseResponse(ORMModel):
    id: int
    journey_id: int
    phase_number: int
    title: str
    title_translated: str | None = None
    description: str | None = None
    milestone_goal: str | None = None
    steps: list[JourneyStepResponse] = Field(default_factory=list)

class JourneyListItemResponse(ORMModel):
    id: int
    title: str
    purpose_input: str
    sector_tag: str | None = None
    summary: str | None = None
    cefr_level: CEFRLevel
    language_pair: LanguagePairResponse | None = None
    status: JourneyStatus
    is_pinned: bool = False
    total_steps: int = 0
    completed_steps: int = 0
    progress_percentage: int = 0
    total_vocab_count: int = 0
    mastered_vocab_count: int = 0
    next_step_id: int | None = None
    next_step_title: str | None = None
    last_accessed_at: datetime | None = None
    created_at: datetime

class JourneyDetailResponse(JourneyListItemResponse):
    clarifications: list[ClarificationAnswerItem] = Field(default_factory=list)
    synthesized_prompt: str
    ai_model: str | None = None
    ai_provider: str | None = None
    phases: list[JourneyPhaseResponse] = Field(default_factory=list)

class JourneyStepPrepareResponse(BaseModel):
    step: JourneyStepResponse
    story_id: int | None = None
    newly_generated: bool = False

class CheckpointAnswerSubmission(BaseModel):
    question_id: str
    selected_answer: str

class JourneyStepCompleteRequest(BaseModel):
    quiz_answers: list[CheckpointAnswerSubmission] = Field(default_factory=list)

class CheckpointQuestionResult(BaseModel):
    question_id: str
    question: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str | None = None

class JourneyStepCompleteResponse(BaseModel):
    step_id: int
    is_completed: bool
    score_percentage: int | None = None
    passed: bool = True
    results: list[CheckpointQuestionResult] = Field(default_factory=list)
    journey_completed_steps: int
    journey_total_steps: int
    journey_status: JourneyStatus

class JourneyPinToggleResponse(BaseModel):
    journey_id: int
    is_pinned: bool

class JourneyBulkFlashcardResponse(BaseModel):
    saved_count: int
    already_saved_count: int
    flashcard_ids: list[int] = Field(default_factory=list)

# ----------------- AI Journey Structured Output Schemas -----------------
class GeneratedClarificationResult(BaseModel):
    is_sufficient: bool = False
    confidence_reason: str
    questions: list[ClarificationQuestionItem] = Field(default_factory=list)
    draft_summary: str
    recommended_sector_tag: str | None = None
    synthesized_prompt: str | None = None

class GeneratedPromptSynthesis(BaseModel):
    synthesized_prompt: str
    summary: str
    recommended_sector_tag: str | None = None

class GeneratedJourneyVocabItem(BaseModel):
    word: str
    translation: str
    part_of_speech: str | None = "noun"
    gender: str | None = None
    phonetic: str | None = None
    example_sentence: str | None = None
    example_translation: str | None = None

class GeneratedCheckpointQuestion(BaseModel):
    id: str
    question_type: str = "multiple_choice"
    question: str
    question_translated: str | None = None
    correct_answer: str
    wrong_answers: list[str] = Field(default_factory=list)
    explanation: str | None = None

class GeneratedJourneyStep(BaseModel):
    step_type: JourneyStepType
    title: str
    title_translated: str | None = None
    description: str | None = None
    grammar_focus: str | None = None
    story_topic_prompt: str | None = None
    story_type: str | None = "dialogue"
    vocabularies: list[GeneratedJourneyVocabItem] = Field(default_factory=list)
    checkpoint_questions: list[GeneratedCheckpointQuestion] = Field(default_factory=list)

class GeneratedJourneyPhase(BaseModel):
    phase_number: int
    title: str
    title_translated: str | None = None
    description: str | None = None
    milestone_goal: str | None = None
    steps: list[GeneratedJourneyStep] = Field(default_factory=list)

class GeneratedJourneyCurriculum(BaseModel):
    title: str
    sector_tag: str | None = None
    summary: str
    phases: list[GeneratedJourneyPhase] = Field(default_factory=list)
