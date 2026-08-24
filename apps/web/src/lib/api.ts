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
} from "../types/api";

const API_BASE_URL =
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
    cefr_level?: string;
    category_slug?: string;
    search?: string;
    is_favorite?: boolean;
    is_completed?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.cefr_level && params.cefr_level !== "all") {
      query.set("cefr_level", params.cefr_level);
    }
    if (params?.category_slug && params.category_slug !== "all") {
      query.set("category_slug", params.category_slug);
    }
    if (params?.search) {
      query.set("search", params.search);
    }
    if (params?.is_favorite !== undefined) {
      query.set("is_favorite", String(params.is_favorite));
    }
    if (params?.is_completed !== undefined) {
      query.set("is_completed", String(params.is_completed));
    }
    if (params?.page) {
      query.set("page", params.page.toString());
    }
    if (params?.limit) {
      query.set("limit", params.limit.toString());
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
    request<{ story_id: number; is_favorite: boolean }>(
      `/api/v1/stories/${storyId}/favorite`,
      { method: "PATCH" }
    ),

  // Categories
  getCategories: () => request<Category[]>("/api/v1/categories"),

  // Languages
  getLanguages: () => request<Language[]>("/api/v1/languages"),

  getLanguagePairs: () => request<LanguagePair[]>("/api/v1/languages/pairs"),

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

  // Quizzes
  submitQuiz: (storyId: number, answers: QuizAnswerSubmission[]) =>
    request<QuizSubmissionResult>(`/api/v1/quizzes/${storyId}/submit`, {
      body: JSON.stringify({ answers }),
      method: "POST",
    }),

  // Progress
  getProgress: () => request<ProgressSummary>("/api/v1/progress"),

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
