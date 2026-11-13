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
  PaginatedStoriesResult,
  ProgressSummary,
  QuestionResult,
  QuizAnswerSubmission,
  QuizSubmissionResult,
  StoryDetail,
  StoryGeneratePayload,
  StoryListItem,
  WordListResponse,
} from "../types/api";
import { api } from "./api";

type StoryCacheEntry =
  | InfiniteData<PaginatedStoriesResult>
  | StoryListItem[]
  | undefined;

interface StoryFilters {
  category_slug?: string;
  cefr_level?: string;
  is_completed?: boolean;
  is_favorite?: boolean;
  limit?: number;
  origin_language_code?: string;
  page?: number;
  search?: string;
  target_language_code?: string;
}

interface FlashcardScopeFilters {
  origin_language_code?: string;
  target_language_code?: string;
}

export const queryKeys = {
  categories: ["categories"] as const,
  dueFlashcards: (filters?: FlashcardScopeFilters) =>
    ["flashcards", "due", filters] as const,
  flashcards: (
    filters?: FlashcardScopeFilters & {
      search?: string;
    }
  ) => ["flashcards", "all", filters] as const,
  infiniteStories: (filters?: Omit<StoryFilters, "page">) =>
    ["stories", "infinite", filters] as const,
  languagePairs: ["languagePairs"] as const,
  languages: ["languages"] as const,
  progress: (filters?: FlashcardScopeFilters) => ["progress", filters] as const,
  stories: (filters?: StoryFilters) => ["stories", "list", filters] as const,
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

function updateStoriesCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  storyId: number,
  updater: (item: StoryListItem) => StoryListItem
): [readonly unknown[], StoryCacheEntry][] {
  const previousStories = queryClient.getQueriesData<
    InfiniteData<PaginatedStoriesResult> | StoryListItem[]
  >({
    queryKey: ["stories"],
  });

  for (const [key, data] of previousStories) {
    if (Array.isArray(data)) {
      queryClient.setQueryData<StoryListItem[]>(
        key,
        data.map((item) => (item.id === storyId ? updater(item) : item))
      );
    } else if (data && typeof data === "object" && "pages" in data) {
      queryClient.setQueryData<InfiniteData<PaginatedStoriesResult>>(key, {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === storyId ? updater(item) : item
          ),
        })),
      });
    }
  }

  return previousStories;
}

function updateProgressCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (summary: ProgressSummary) => ProgressSummary
): [readonly unknown[], ProgressSummary | undefined][] {
  const previousProgress = queryClient.getQueriesData<ProgressSummary>({
    queryKey: ["progress"],
  });
  for (const [key, data] of previousProgress) {
    if (data) {
      queryClient.setQueryData<ProgressSummary>(key, updater(data));
    }
  }
  return previousProgress;
}

export function useStories(filters?: StoryFilters) {
  return useQuery({
    queryFn: () => api.getStories(filters),
    queryKey: queryKeys.stories(filters),
  });
}

export function useInfiniteStories(filters?: Omit<StoryFilters, "page">) {
  const limit = filters?.limit ?? 12;
  return useInfiniteQuery({
    getNextPageParam: (lastPage: PaginatedStoriesResult) => {
      const loaded = lastPage.page * lastPage.limit;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.getStoriesPaginated({
        ...filters,
        limit,
        page: pageParam,
      }),
    queryKey: queryKeys.infiniteStories(filters),
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

export function useProgress(filters?: FlashcardScopeFilters) {
  return useQuery({
    queryFn: () => api.getProgress(filters),
    queryKey: queryKeys.progress(filters),
  });
}

export function useDueFlashcards(filters?: FlashcardScopeFilters) {
  return useQuery({
    queryFn: () => api.getDueFlashcards(filters),
    queryKey: queryKeys.dueFlashcards(filters),
  });
}

export function useAllFlashcards(
  filters?: FlashcardScopeFilters & { search?: string }
) {
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
      previousStories?: [readonly unknown[], StoryCacheEntry][];
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

      const previousStories = updateStoriesCaches(
        queryClient,
        storyId,
        (item) => ({
          ...item,
          is_favorite: !item.is_favorite,
        })
      );
      const previousStory = queryClient.getQueryData<StoryDetail>(
        queryKeys.story(storyId)
      );

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
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
    onSuccess: (data) => {
      toast.success(
        data.is_favorite ? "Added to favorites!" : "Removed from favorites"
      );
    },
  });
}

export function useMarkStoryCompleted(storyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.markStoryCompleted(storyId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.story(storyId) });
      await queryClient.cancelQueries({ queryKey: ["stories"] });
      await queryClient.cancelQueries({ queryKey: ["progress"] });

      const previousStory = queryClient.getQueryData<StoryDetail>(
        queryKeys.story(storyId)
      );
      if (previousStory) {
        queryClient.setQueryData<StoryDetail>(queryKeys.story(storyId), {
          ...previousStory,
          is_completed: true,
        });
      }

      const previousStories = updateStoriesCaches(
        queryClient,
        storyId,
        (item) => ({
          ...item,
          is_completed: true,
        })
      );
      const previousProgress =
        previousStory && !previousStory.is_completed
          ? updateProgressCaches(queryClient, (summary) => ({
              ...summary,
              total_stories_read: summary.total_stories_read + 1,
            }))
          : undefined;

      return { previousProgress, previousStories, previousStory };
    },
    onError: (error: Error, _vars, context) => {
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
        for (const [key, data] of context.previousProgress) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || "Failed to mark story as completed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.story(storyId) });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
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
      previousProgress?: [readonly unknown[], ProgressSummary | undefined][];
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
        for (const [key, data] of context.previousProgress) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || "Failed to save flashcard");
    },
    onMutate: async (vocabularyId: number) => {
      await queryClient.cancelQueries({ queryKey: ["story"] });
      await queryClient.cancelQueries({ queryKey: ["progress"] });

      const previousStories = queryClient.getQueriesData<StoryDetail>({
        queryKey: ["story"],
      });

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

      const previousProgress = updateProgressCaches(queryClient, (summary) => ({
        ...summary,
        total_words_learned: summary.total_words_learned + 1,
      }));

      return { previousProgress, previousStories };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["story"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
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
      previousAllQueries?: [readonly unknown[], Flashcard[] | undefined][];
      previousDueQueries?: [readonly unknown[], Flashcard[] | undefined][];
      previousProgress?: [readonly unknown[], ProgressSummary | undefined][];
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
      if (context?.previousDueQueries) {
        for (const [key, data] of context.previousDueQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousAllQueries) {
        for (const [key, data] of context.previousAllQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousProgress) {
        for (const [key, data] of context.previousProgress) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || "Failed to submit review");
    },
    onMutate: async ({ flashcardId, quality }) => {
      await queryClient.cancelQueries({ queryKey: ["flashcards"] });
      await queryClient.cancelQueries({ queryKey: ["progress"] });

      const previousDueQueries = queryClient.getQueriesData<Flashcard[]>({
        queryKey: ["flashcards", "due"],
      });
      const previousAllQueries = queryClient.getQueriesData<Flashcard[]>({
        queryKey: ["flashcards", "all"],
      });

      for (const [key, list] of previousDueQueries) {
        if (list && Array.isArray(list)) {
          queryClient.setQueryData<Flashcard[]>(
            key,
            list.filter((fc) => fc.id !== flashcardId)
          );
        }
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

      const previousProgress = updateProgressCaches(queryClient, (summary) => ({
        ...summary,
        flashcards_due_today: Math.max(0, summary.flashcards_due_today - 1),
      }));

      return { previousAllQueries, previousDueQueries, previousProgress };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
    onSuccess: (data) => {
      toast.success(data.message || "Review recorded!");
    },
  });
}

export function useDeleteFlashcard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flashcardId: number) => api.deleteFlashcard(flashcardId),
    onMutate: async (flashcardId: number) => {
      await queryClient.cancelQueries({ queryKey: ["flashcards"] });
      const previousFlashcardQueries = queryClient.getQueriesData<Flashcard[]>({
        queryKey: ["flashcards"],
      });
      for (const [key, list] of previousFlashcardQueries) {
        if (list && Array.isArray(list)) {
          queryClient.setQueryData<Flashcard[]>(
            key,
            list.filter((fc) => fc.id !== flashcardId)
          );
        }
      }
      return { previousFlashcardQueries };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousFlashcardQueries) {
        for (const [key, data] of context.previousFlashcardQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || "Failed to delete flashcard");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["story"] });
      queryClient.invalidateQueries({ queryKey: ["words"] });
    },
  });
}

export function useCheckQuizAnswer(storyId: number) {
  return useMutation<QuestionResult, Error, QuizAnswerSubmission>({
    mutationFn: (submission: QuizAnswerSubmission) =>
      api.checkQuizAnswer(storyId, submission),
    onError: (error: Error) => {
      toast.error(error.message || "Failed to check answer");
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
      previousProgress?: [readonly unknown[], ProgressSummary | undefined][];
      previousStories?: [readonly unknown[], StoryCacheEntry][];
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
        for (const [key, data] of context.previousProgress) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || "Failed to submit quiz");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.story(storyId) });
      await queryClient.cancelQueries({ queryKey: ["stories"] });
      await queryClient.cancelQueries({ queryKey: ["progress"] });

      const previousStory = queryClient.getQueryData<StoryDetail>(
        queryKeys.story(storyId)
      );

      if (previousStory) {
        queryClient.setQueryData<StoryDetail>(queryKeys.story(storyId), {
          ...previousStory,
          is_completed: true,
        });
      }

      const previousStories = updateStoriesCaches(
        queryClient,
        storyId,
        (item) => ({
          ...item,
          is_completed: true,
        })
      );

      const previousProgress =
        previousStory && !previousStory.is_completed
          ? updateProgressCaches(queryClient, (summary) => ({
              ...summary,
              total_stories_read: summary.total_stories_read + 1,
            }))
          : undefined;

      return { previousProgress, previousStories, previousStory };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.story(storyId) });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
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
  return useMutation<StoryDetail, Error, StoryGeneratePayload>({
    mutationFn: (payload: StoryGeneratePayload) => api.generateStory(payload),
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate story");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
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
    getNextPageParam: (lastPage: WordListResponse) =>
      lastPage.has_next || lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
    getPreviousPageParam: (firstPage: WordListResponse) =>
      firstPage.has_prev || firstPage.page > 1 ? firstPage.page - 1 : undefined,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
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
      previousProgress?: [readonly unknown[], ProgressSummary | undefined][];
      previousWords?: [readonly unknown[], WordListResponse | undefined][];
    }
  >({
    mutationFn: (wordId: number) => api.saveWordFlashcard(wordId),
    onError: (error: Error, _, context) => {
      if (context?.previousProgress) {
        for (const [key, data] of context.previousProgress) {
          queryClient.setQueryData(key, data);
        }
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
      await queryClient.cancelQueries({ queryKey: ["progress"] });

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

      const previousProgress = updateProgressCaches(queryClient, (summary) => ({
        ...summary,
        total_words_learned: summary.total_words_learned + 1,
      }));

      return { previousInfiniteWords, previousProgress, previousWords };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["words"] });
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
    onSuccess: () => {
      toast.success("Word saved to flashcards!");
    },
  });
}
