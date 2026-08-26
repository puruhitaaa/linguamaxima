import type { InfiniteData } from "@tanstack/react-query";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  Flashcard,
  FlashcardReviewResult,
  ProgressSummary,
  QuizAnswerSubmission,
  QuizSubmissionResult,
  StoryDetail,
  StoryGeneratePayload,
  StoryListItem,
  WordListResponse,
} from "../types/api";
import { api } from "./api";

export const queryKeys = {
  categories: ["categories"] as const,
  dueFlashcards: ["flashcards", "due"] as const,
  flashcards: (filters?: { search?: string }) =>
    ["flashcards", filters] as const,
  languagePairs: ["languagePairs"] as const,
  languages: ["languages"] as const,
  progress: ["progress"] as const,
  stories: (filters?: {
    category_slug?: string;
    cefr_level?: string;
    is_completed?: boolean;
    is_favorite?: boolean;
    limit?: number;
    origin_language_code?: string;
    page?: number;
    search?: string;
    target_language_code?: string;
  }) => ["stories", filters] as const,
  story: (id: number | string) => ["story", String(id)] as const,
  word: (id: number | string) => ["word", String(id)] as const,
  wordFilters: (lang?: string) => ["wordFilters", lang ?? "de"] as const,
  words: (filters?: {
    lang?: string;
    level?: string;
    page?: number;
    page_size?: number;
    pos?: string;
    search?: string;
  }) => ["words", filters] as const,
};

export function useStories(filters?: {
  category_slug?: string;
  cefr_level?: string;
  is_completed?: boolean;
  is_favorite?: boolean;
  limit?: number;
  origin_language_code?: string;
  page?: number;
  search?: string;
  target_language_code?: string;
}) {
  return useQuery({
    queryFn: () => api.getStories(filters),
    queryKey: queryKeys.stories(filters),
  });
}

export function useLanguages() {
  return useQuery({
    queryFn: () => api.getLanguages(),
    queryKey: queryKeys.languages,
  });
}

export function useLanguagePairs() {
  return useQuery({
    queryFn: () => api.getLanguagePairs(),
    queryKey: queryKeys.languagePairs,
  });
}

export function useCreateLanguagePair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      origin_language_code: string;
      target_language_code: string;
    }) => api.createLanguagePair(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.languagePairs });
    },
  });
}

export function useStory(id: number | string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => api.getStory(id),
    queryKey: queryKeys.story(id),
  });
}

export function useCategories() {
  return useQuery({
    queryFn: () => api.getCategories(),
    queryKey: queryKeys.categories,
  });
}

export function useProgress() {
  return useQuery({
    queryFn: () => api.getProgress(),
    queryKey: queryKeys.progress,
  });
}

export function useDueFlashcards() {
  return useQuery({
    queryFn: () => api.getDueFlashcards(),
    queryKey: queryKeys.dueFlashcards,
  });
}

export function useAllFlashcards(filters?: { search?: string }) {
  return useQuery({
    queryFn: () => api.getAllFlashcards(filters),
    queryKey: queryKeys.flashcards(filters),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation<
    { is_favorite: boolean; story_id: number },
    Error,
    number,
    {
      previousStories?: [readonly unknown[], StoryListItem[] | undefined][];
      previousStory?: StoryDetail;
      storyId?: number;
    }
  >({
    mutationFn: (storyId: number) => api.toggleFavorite(storyId),
    onError: (error: Error, _, context) => {
      if (context?.previousStories) {
        for (const [key, data] of context.previousStories) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.storyId && context.previousStory !== undefined) {
        queryClient.setQueryData(
          queryKeys.story(context.storyId),
          context.previousStory
        );
      }
      toast.error(error.message || "Failed to update favorite status");
    },
    onMutate: async (storyId: number) => {
      await queryClient.cancelQueries({ queryKey: ["stories"] });
      await queryClient.cancelQueries({ queryKey: queryKeys.story(storyId) });

      const previousStories = queryClient.getQueriesData<StoryListItem[]>({
        queryKey: ["stories"],
      });
      const previousStory = queryClient.getQueryData<StoryDetail>(
        queryKeys.story(storyId)
      );

      for (const [key, data] of previousStories) {
        if (data) {
          queryClient.setQueryData<StoryListItem[]>(
            key,
            data.map((item) =>
              item.id === storyId
                ? { ...item, is_favorite: !item.is_favorite }
                : item
            )
          );
        }
      }

      if (previousStory) {
        queryClient.setQueryData<StoryDetail>(queryKeys.story(storyId), {
          ...previousStory,
          is_favorite: !previousStory.is_favorite,
        });
      }

      return { previousStories, previousStory, storyId };
    },
    onSettled: (_, __, storyId) => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.story(storyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
    onSuccess: (data) => {
      toast.success(
        data.is_favorite ? "Added to favorites!" : "Removed from favorites"
      );
    },
  });
}

export function useSaveFlashcard() {
  const queryClient = useQueryClient();
  return useMutation<
    Flashcard,
    Error,
    number,
    {
      previousProgress?: ProgressSummary;
      previousStories?: [readonly unknown[], StoryDetail | undefined][];
    }
  >({
    mutationFn: (vocabularyId: number) => api.saveFlashcard(vocabularyId),
    onError: (error: Error, _, context) => {
      if (context?.previousStories) {
        for (const [key, data] of context.previousStories) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousProgress) {
        queryClient.setQueryData(queryKeys.progress, context.previousProgress);
      }
      toast.error(error.message || "Failed to save flashcard");
    },
    onMutate: async (vocabularyId: number) => {
      await queryClient.cancelQueries({ queryKey: ["story"] });
      await queryClient.cancelQueries({ queryKey: queryKeys.progress });

      const previousStories = queryClient.getQueriesData<StoryDetail>({
        queryKey: ["story"],
      });
      const previousProgress = queryClient.getQueryData<ProgressSummary>(
        queryKeys.progress
      );

      for (const [key, story] of previousStories) {
        if (story?.vocabulary) {
          queryClient.setQueryData<StoryDetail>(key, {
            ...story,
            vocabulary: story.vocabulary.map((v) =>
              v.id === vocabularyId ? { ...v, is_saved_as_flashcard: true } : v
            ),
          });
        }
      }

      if (previousProgress) {
        queryClient.setQueryData<ProgressSummary>(queryKeys.progress, {
          ...previousProgress,
          total_words_learned: previousProgress.total_words_learned + 1,
        });
      }

      return { previousProgress, previousStories };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["story"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
    onSuccess: () => {
      toast.success("Saved to flashcards!");
    },
  });
}

export function useReviewFlashcard() {
  const queryClient = useQueryClient();
  return useMutation<
    FlashcardReviewResult,
    Error,
    { flashcardId: number; quality: number },
    {
      previousAll?: Flashcard[];
      previousDue?: Flashcard[];
      previousProgress?: ProgressSummary;
    }
  >({
    mutationFn: ({
      flashcardId,
      quality,
    }: {
      flashcardId: number;
      quality: number;
    }) => api.reviewFlashcard(flashcardId, quality),
    onError: (error: Error, _, context) => {
      if (context?.previousDue) {
        queryClient.setQueryData(queryKeys.dueFlashcards, context.previousDue);
      }
      if (context?.previousAllQueries) {
        for (const [key, data] of context.previousAllQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousProgress) {
        queryClient.setQueryData(queryKeys.progress, context.previousProgress);
      }
      toast.error(error.message || "Failed to submit review");
    },
    onMutate: async ({ flashcardId, quality }) => {
      await queryClient.cancelQueries({ queryKey: ["flashcards"] });
      await queryClient.cancelQueries({ queryKey: queryKeys.progress });

      const previousDue = queryClient.getQueryData<Flashcard[]>(
        queryKeys.dueFlashcards
      );
      const previousAllQueries = queryClient.getQueriesData<Flashcard[]>({
        queryKey: ["flashcards"],
      });
      const previousProgress = queryClient.getQueryData<ProgressSummary>(
        queryKeys.progress
      );

      if (previousDue) {
        queryClient.setQueryData<Flashcard[]>(
          queryKeys.dueFlashcards,
          previousDue.filter((fc) => fc.id !== flashcardId)
        );
      }

      for (const [key, list] of previousAllQueries) {
        if (list && Array.isArray(list)) {
          queryClient.setQueryData<Flashcard[]>(
            key,
            list.map((fc) => {
              if (fc.id !== flashcardId) {
                return fc;
              }
              return {
                ...fc,
                interval_days:
                  quality >= 3 ? Math.max(1, fc.interval_days * 2) : 1,
                last_reviewed: new Date().toISOString(),
                repetitions: quality >= 3 ? fc.repetitions + 1 : 0,
              };
            })
          );
        }
      }

      if (previousProgress) {
        queryClient.setQueryData<ProgressSummary>(queryKeys.progress, {
          ...previousProgress,
          flashcards_due_today: Math.max(
            0,
            previousProgress.flashcards_due_today - 1
          ),
        });
      }

      return { previousAllQueries, previousDue, previousProgress };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
    onSuccess: (data) => {
      toast.success(data.message || "Review recorded!");
    },
  });
}

export function useSubmitQuiz(storyId: number) {
  const queryClient = useQueryClient();
  return useMutation<
    QuizSubmissionResult,
    Error,
    QuizAnswerSubmission[],
    {
      previousProgress?: ProgressSummary;
      previousStories?: [readonly unknown[], StoryListItem[] | undefined][];
      previousStory?: StoryDetail;
    }
  >({
    mutationFn: (answers: QuizAnswerSubmission[]) =>
      api.submitQuiz(storyId, answers),
    onError: (error: Error, _, context) => {
      if (context?.previousStory !== undefined) {
        queryClient.setQueryData(
          queryKeys.story(storyId),
          context.previousStory
        );
      }
      if (context?.previousStories) {
        for (const [key, data] of context.previousStories) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousProgress) {
        queryClient.setQueryData(queryKeys.progress, context.previousProgress);
      }
      toast.error(error.message || "Failed to submit quiz");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.story(storyId) });
      await queryClient.cancelQueries({ queryKey: ["stories"] });
      await queryClient.cancelQueries({ queryKey: queryKeys.progress });

      const previousStory = queryClient.getQueryData<StoryDetail>(
        queryKeys.story(storyId)
      );
      const previousStories = queryClient.getQueriesData<StoryListItem[]>({
        queryKey: ["stories"],
      });
      const previousProgress = queryClient.getQueryData<ProgressSummary>(
        queryKeys.progress
      );

      if (previousStory) {
        queryClient.setQueryData<StoryDetail>(queryKeys.story(storyId), {
          ...previousStory,
          is_completed: true,
        });
      }

      for (const [key, data] of previousStories) {
        if (data) {
          queryClient.setQueryData<StoryListItem[]>(
            key,
            data.map((item) =>
              item.id === storyId ? { ...item, is_completed: true } : item
            )
          );
        }
      }

      if (previousProgress && previousStory && !previousStory.is_completed) {
        queryClient.setQueryData<ProgressSummary>(queryKeys.progress, {
          ...previousProgress,
          total_stories_read: previousProgress.total_stories_read + 1,
        });
      }

      return { previousProgress, previousStories, previousStory };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.story(storyId) });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
    onSuccess: (data) => {
      if (data.passed) {
        toast.success(
          `Quiz passed with ${data.score_percentage}%! Ausgezeichnet!`
        );
      } else {
        toast.info(
          `Quiz submitted: ${data.score_percentage}%. Keep practicing!`
        );
      }
    },
  });
}

export function useGenerateStory() {
  const queryClient = useQueryClient();
  return useMutation<
    StoryDetail,
    Error,
    StoryGeneratePayload,
    {
      previousStories?: [readonly unknown[], StoryListItem[] | undefined][];
    }
  >({
    mutationFn: (payload: StoryGeneratePayload) => api.generateStory(payload),
    onError: (error: Error, _, context) => {
      if (context?.previousStories) {
        for (const [key, data] of context.previousStories) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || "Failed to generate story");
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["stories"] });

      const previousStories = queryClient.getQueriesData<StoryListItem[]>({
        queryKey: ["stories"],
      });

      const optimisticStory: StoryListItem = {
        cefr_level: payload.cefr_level,
        created_at: new Date().toISOString(),
        estimated_reading_minutes: 2,
        id: -Date.now(),
        is_completed: false,
        is_favorite: false,
        summary:
          "AI is generating an interactive graded story with vocabulary and quiz...",
        title:
          payload.topic_hint ||
          `Generating Level ${payload.cefr_level} Story...`,
        title_translated: "Creating new story with AI...",
        word_count: 120,
      };

      for (const [key, data] of previousStories) {
        if (data) {
          queryClient.setQueryData<StoryListItem[]>(key, [
            optimisticStory,
            ...data,
          ]);
        }
      }

      return { previousStories };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
    onSuccess: () => {
      toast.success("Story successfully generated by AI!");
    },
  });
}

export function useWords(filters?: {
  lang?: string;
  level?: string;
  page?: number;
  page_size?: number;
  pos?: string;
  search?: string;
}) {
  return useQuery({
    queryFn: () => api.getWords(filters),
    queryKey: queryKeys.words(filters),
  });
}

export function useInfiniteWords(filters?: {
  lang?: string;
  level?: string;
  page_size?: number;
  pos?: string;
  search?: string;
}) {
  const pageSize = filters?.page_size ?? 24;
  return useInfiniteQuery({
    getNextPageParam: (lastPage) =>
      lastPage.has_next || lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.has_prev || firstPage.page > 1 ? firstPage.page - 1 : undefined,
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      api.getWords({
        ...filters,
        page: pageParam,
        page_size: pageSize,
      }),
    queryKey: queryKeys.words(filters),
  });
}

export function useWordFilters(lang = "de") {
  return useQuery({
    queryFn: () => api.getWordFilters(lang),
    queryKey: queryKeys.wordFilters(lang),
  });
}

export function useWord(id: number | string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => api.getWord(id),
    queryKey: queryKeys.word(id),
  });
}

export function useSaveWordFlashcard() {
  const queryClient = useQueryClient();
  return useMutation<
    Flashcard,
    Error,
    number,
    {
      previousInfiniteWords?: [
        readonly unknown[],
        InfiniteData<WordListResponse> | undefined,
      ][];
      previousProgress?: ProgressSummary;
      previousWords?: [readonly unknown[], WordListResponse | undefined][];
    }
  >({
    mutationFn: (wordId: number) => api.saveWordFlashcard(wordId),
    onError: (error: Error, _, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(queryKeys.progress, context.previousProgress);
      }
      if (context?.previousInfiniteWords) {
        for (const [key, data] of context.previousInfiniteWords) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousWords) {
        for (const [key, data] of context.previousWords) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || "Failed to save word to flashcards");
    },
    onMutate: async (wordId: number) => {
      await queryClient.cancelQueries({ queryKey: ["words"] });
      await queryClient.cancelQueries({ queryKey: queryKeys.progress });

      const previousProgress = queryClient.getQueryData<ProgressSummary>(
        queryKeys.progress
      );
      const previousInfiniteWords = queryClient.getQueriesData<
        InfiniteData<WordListResponse>
      >({
        queryKey: ["words"],
      });
      const previousWords = queryClient.getQueriesData<WordListResponse>({
        queryKey: ["words"],
      });

      for (const [key, data] of previousInfiniteWords) {
        if (data?.pages) {
          queryClient.setQueryData<InfiniteData<WordListResponse>>(key, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((w) =>
                w.id === wordId ? { ...w, is_saved_as_flashcard: true } : w
              ),
            })),
          });
        }
      }

      for (const [key, data] of previousWords) {
        if (data?.items) {
          queryClient.setQueryData<WordListResponse>(key, {
            ...data,
            items: data.items.map((w) =>
              w.id === wordId ? { ...w, is_saved_as_flashcard: true } : w
            ),
          });
        }
      }

      if (previousProgress) {
        queryClient.setQueryData<ProgressSummary>(queryKeys.progress, {
          ...previousProgress,
          total_words_learned: previousProgress.total_words_learned + 1,
        });
      }

      return { previousInfiniteWords, previousProgress, previousWords };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["words"] });
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
    onSuccess: () => {
      toast.success("Word saved to flashcards!");
    },
  });
}
