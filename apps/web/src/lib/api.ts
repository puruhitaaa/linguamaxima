import type {
  Category,
  Flashcard,
  FlashcardReviewResult,
  Language,
  LanguagePair,
  ProgressSummary,
  QuizAnswerSubmission,
  QuizSubmissionResult,
  StoryDetail,
  StoryGeneratePayload,
  StoryListItem,
  WordFilterMeta,
  WordItem,
  WordListResponse,
} from "../types/api";

const API_BASE_URL =
  (typeof process !== "undefined" &&
    (process.env?.VITE_API_URL || process.env?.API_URL)) ||
  (import.meta !== undefined && import.meta.env?.VITE_API_URL) ||
  "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});
  if (
    !headers.has("Content-Type") &&
    options.body &&
    typeof options.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "API request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Stories
  getStories: (params?: {
    category_slug?: string;
    cefr_level?: string;
    is_completed?: boolean;
    is_favorite?: boolean;
    limit?: number;
    origin_language_code?: string;
    page?: number;
    search?: string;
    target_language_code?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "all" && value !== "") {
          query.set(key, String(value));
        }
      }
    }
    const qs = query.toString();
    return request<StoryListItem[]>(`/api/v1/stories${qs ? `?${qs}` : ""}`);
  },

  getStory: (id: number | string) =>
    request<StoryDetail>(`/api/v1/stories/${id}`),

  generateStory: (payload: StoryGeneratePayload) =>
    request<StoryDetail>("/api/v1/stories/generate", {
      body: JSON.stringify(payload),
      method: "POST",
    }),

  toggleFavorite: (storyId: number) =>
    request<{ is_favorite: boolean; story_id: number }>(
      `/api/v1/stories/${storyId}/favorite`,
      { method: "PATCH" }
    ),

  // Categories
  getCategories: () => request<Category[]>("/api/v1/categories"),

  // Languages
  getLanguages: () => request<Language[]>("/api/v1/languages"),

  getLanguagePairs: () => request<LanguagePair[]>("/api/v1/languages/pairs"),

  createLanguagePair: (payload: {
    origin_language_code: string;
    target_language_code: string;
  }) =>
    request<LanguagePair>("/api/v1/languages/pairs", {
      body: JSON.stringify(payload),
      method: "POST",
    }),

  // Flashcards
  getAllFlashcards: (params?: { search?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) {
      query.set("search", params.search);
    }
    const qs = query.toString();
    return request<Flashcard[]>(`/api/v1/flashcards${qs ? `?${qs}` : ""}`);
  },

  getDueFlashcards: () => request<Flashcard[]>("/api/v1/flashcards/due"),

  saveFlashcard: (vocabularyId: number) =>
    request<Flashcard>("/api/v1/flashcards", {
      body: JSON.stringify({ vocabulary_id: vocabularyId }),
      method: "POST",
    }),

  reviewFlashcard: (flashcardId: number, quality: number) =>
    request<FlashcardReviewResult>(`/api/v1/flashcards/${flashcardId}/review`, {
      body: JSON.stringify({ quality }),
      method: "PATCH",
    }),

  // Words / Dictionary
  getWords: (params?: {
    lang?: string;
    level?: string;
    page?: number;
    page_size?: number;
    pos?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "all" && value !== "") {
          query.set(key, String(value));
        }
      }
    }
    const qs = query.toString();
    return request<WordListResponse>(`/api/v1/words${qs ? `?${qs}` : ""}`);
  },

  getWordFilters: (lang = "de") =>
    request<WordFilterMeta>(
      `/api/v1/words/filters?lang=${encodeURIComponent(lang)}`
    ),

  getWord: (id: number | string) => request<WordItem>(`/api/v1/words/${id}`),

  saveWordFlashcard: (wordId: number) =>
    request<Flashcard>(`/api/v1/words/${wordId}/flashcard`, {
      method: "POST",
    }),

  // Quizzes
  submitQuiz: (storyId: number, answers: QuizAnswerSubmission[]) =>
    request<QuizSubmissionResult>(`/api/v1/quizzes/${storyId}/submit`, {
      body: JSON.stringify({ answers }),
      method: "POST",
    }),

  // Progress
  getProgress: () => request<ProgressSummary>("/api/v1/progress"),

  // TTS Generation
  generateTTS: (text: string, language = "de", voice?: string) =>
    request<{ audio_url: string }>("/api/v1/tts/generate", {
      body: JSON.stringify({ language, text, voice }),
      method: "POST",
    }),

  // Helper for full audio URL
  getMediaUrl: (relativePath?: string) => {
    if (!relativePath) {
      return "";
    }
    if (
      relativePath.startsWith("http://") ||
      relativePath.startsWith("https://")
    ) {
      return relativePath;
    }
    return `${API_BASE_URL}${relativePath.startsWith("/") ? relativePath : `/${relativePath}`}`;
  },
};
