export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface Language {
  id: number;
  code: string;
  name: string;
  native_name?: string;
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
  vocabulary_id: number;
  vocabulary: VocabularyItem;
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
}

export interface LanguagePairCreatePayload {
  origin_language_code: string;
  target_language_code: string;
}
