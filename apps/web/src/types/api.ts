export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type ProficiencyFramework =
  | "cefr"
  | "jlpt"
  | "hsk"
  | "bipa"
  | "torfl"
  | "frequency";

export interface Language {
  id: number;
  code: string;
  name: string;
  native_name?: string;
  proficiency_framework?: ProficiencyFramework;
}

export interface LanguagePair {
  id: number;
  origin_language: Language;
  target_language: Language;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
}

export interface WordItem {
  id: number;
  language_id: number;
  lemma: string;
  normalized_level: CEFRLevel;
  native_level?: string | null;
  part_of_speech: string;
  gender?: string | null;
  phonetic?: string | null;
  translation: string;
  definition?: string | null;
  example_sentence?: string | null;
  example_translation?: string | null;
  audio_url?: string | null;
  frequency_rank?: number | null;
  is_saved_as_flashcard?: boolean;
  created_at: string;
}

export interface WordListResponse {
  items: WordItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export interface FilterCountItem {
  key: string;
  label: string;
  count: number;
}

export interface WordFilterMeta {
  language_code: string;
  language_name: string;
  proficiency_framework: ProficiencyFramework;
  total_words: number;
  levels: FilterCountItem[];
  parts_of_speech: FilterCountItem[];
}

export interface VocabularyItem {
  id: number;
  story_id: number;
  word: string;
  translation: string;
  part_of_speech?: string;
  gender?: "der" | "die" | "das" | null;
  example_sentence?: string;
  example_translation?: string;
  pronunciation_url?: string;
  difficulty_rank: number;
  is_saved_as_flashcard?: boolean;
}

export interface GrammarTip {
  id: number;
  story_id: number;
  title: string;
  explanation: string;
  explanation_translated?: string;
  example?: string;
  example_translation?: string;
  sort_order: number;
}

export interface QuizQuestion {
  id: number;
  story_id: number;
  question_type:
    | "multiple_choice"
    | "article"
    | "fill_blank"
    | "true_false"
    | string;
  question: string;
  question_translated?: string;
  options: string[];
  explanation?: string;
  sort_order: number;
}

export interface StoryListItem {
  id: number;
  title: string;
  title_translated?: string;
  summary?: string;
  cefr_level: CEFRLevel;
  category?: Category;
  language_pair?: LanguagePair;
  image_url?: string;
  audio_url?: string;
  estimated_reading_minutes: number;
  word_count: number;
  is_favorite: boolean;
  is_completed: boolean;
  quiz_score?: number | null;
  created_at: string;
}

export interface StoryDetail extends StoryListItem {
  content: string;
  content_translated?: string;
  ai_model?: string;
  ai_provider?: string;
  vocabulary: VocabularyItem[];
  grammar_tips: GrammarTip[];
  quizzes: QuizQuestion[];
}

export interface QuizAnswerSubmission {
  question_id: number;
  selected_answer: string;
}

export interface QuestionResult {
  question_id: number;
  question: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string;
}

export interface QuizSubmissionResult {
  story_id: number;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  passed: boolean;
  results: QuestionResult[];
}

export interface Flashcard {
  id: number;
  vocabulary_id?: number | null;
  vocabulary?: VocabularyItem | null;
  word_id?: number | null;
  word?: WordItem | null;
  journey_vocabulary_id?: number | null;
  journey_vocabulary?: JourneyVocabularyItem | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  last_reviewed?: string | null;
  created_at: string;
}

export interface FlashcardReviewResult {
  id: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  message: string;
}

export interface ProgressSummary {
  total_stories_read: number;
  total_stories_available: number;
  total_words_learned: number;
  flashcards_due_today: number;
  current_streak_days: number;
  average_quiz_score: number;
}

export interface StoryGeneratePayload {
  cefr_level: CEFRLevel;
  category_slug: string;
  topic_hint?: string;
  target_language_code?: string;
  origin_language_code?: string;
  story_type?: "auto" | "dialogue" | "monologue" | "informative";
}

export interface LanguagePairCreatePayload {
  origin_language_code: string;
  target_language_code: string;
}

// ----------------- Learning Journeys -----------------
export type JourneyStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "paused";

export type JourneyStepType = "vocab_pack" | "story_lesson" | "checkpoint";

export type JourneySortBy =
  | "recent"
  | "progress_desc"
  | "progress_asc"
  | "newest"
  | "oldest"
  | "level_asc"
  | "level_desc"
  | "title_asc";

export interface ClarificationAnswerItem {
  question_id: string;
  question: string;
  answer: string;
}

export interface ClarificationQuestionItem {
  id: string;
  question: string;
  hint?: string | null;
  input_type: "chips" | "multi_chips" | "text";
  suggested_options: string[];
}

export interface JourneyClarifyPayload {
  purpose: string;
  origin_language_code: string;
  target_language_code: string;
  answers: ClarificationAnswerItem[];
  round: number;
}

export interface JourneyClarifyResult {
  is_sufficient: boolean;
  confidence_reason: string;
  questions: ClarificationQuestionItem[];
  draft_summary: string;
  recommended_sector_tag?: string | null;
  synthesized_prompt?: string | null;
}

export interface JourneyPromptPreviewPayload {
  purpose: string;
  clarifications: ClarificationAnswerItem[];
  cefr_level: CEFRLevel;
  origin_language_code: string;
  target_language_code: string;
}

export interface JourneyPromptPreviewResult {
  synthesized_prompt: string;
  summary: string;
  recommended_sector_tag?: string | null;
  estimated_phases: number;
  estimated_vocab_count: number;
}

export interface JourneyGeneratePayload {
  purpose: string;
  clarifications: ClarificationAnswerItem[];
  cefr_level: CEFRLevel;
  origin_language_code: string;
  target_language_code: string;
  custom_prompt_override?: string;
}

export interface JourneyVocabularyItem {
  id: number;
  journey_id: number;
  step_id: number;
  word: string;
  translation: string;
  part_of_speech?: string | null;
  gender?: string | null;
  phonetic?: string | null;
  example_sentence?: string | null;
  example_translation?: string | null;
  pronunciation_url?: string | null;
  is_mastered: boolean;
  is_saved_as_flashcard: boolean;
}

export interface CheckpointQuestionItem {
  id: string;
  question_type: string;
  question: string;
  question_translated?: string | null;
  options: string[];
  explanation?: string | null;
}

export interface JourneyStepItem {
  id: number;
  phase_id: number;
  journey_id: number;
  step_order: number;
  step_type: JourneyStepType;
  title: string;
  title_translated?: string | null;
  description?: string | null;
  grammar_focus?: string | null;
  story_type?: string | null;
  story_id?: number | null;
  is_story_prepared: boolean;
  is_completed: boolean;
  completed_at?: string | null;
  best_score?: number | null;
  vocabularies: JourneyVocabularyItem[];
  checkpoint_questions: CheckpointQuestionItem[];
}

export interface JourneyPhaseItem {
  id: number;
  journey_id: number;
  phase_number: number;
  title: string;
  title_translated?: string | null;
  description?: string | null;
  milestone_goal?: string | null;
  steps: JourneyStepItem[];
}

export interface JourneyListItem {
  id: number;
  title: string;
  purpose_input: string;
  sector_tag?: string | null;
  summary?: string | null;
  cefr_level: CEFRLevel;
  language_pair?: LanguagePair | null;
  status: JourneyStatus;
  is_pinned: boolean;
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  total_vocab_count: number;
  mastered_vocab_count: number;
  next_step_id?: number | null;
  next_step_title?: string | null;
  last_accessed_at?: string | null;
  created_at: string;
}

export interface JourneyDetail extends JourneyListItem {
  clarifications: ClarificationAnswerItem[];
  synthesized_prompt: string;
  ai_model?: string | null;
  ai_provider?: string | null;
  phases: JourneyPhaseItem[];
}

export interface JourneyStepPrepareResult {
  step: JourneyStepItem;
  story_id?: number | null;
  newly_generated: boolean;
}

export interface CheckpointAnswerSubmission {
  question_id: string;
  selected_answer: string;
}

export interface CheckpointQuestionResult {
  question_id: string;
  question: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string | null;
}

export interface JourneyStepCompleteResult {
  step_id: number;
  is_completed: boolean;
  score_percentage?: number | null;
  passed: boolean;
  results: CheckpointQuestionResult[];
  journey_completed_steps: number;
  journey_total_steps: number;
  journey_status: JourneyStatus;
}

export interface JourneyBulkFlashcardResult {
  saved_count: number;
  already_saved_count: number;
  flashcard_ids: number[];
}
