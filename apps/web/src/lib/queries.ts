import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { QuizAnswerSubmission, StoryGeneratePayload } from "../types/api";
import { api } from "./api";

export const queryKeys = {
  categories: ["categories"] as const,
  dueFlashcards: ["flashcards", "due"] as const,
  flashcards: ["flashcards"] as const,
  languagePairs: ["languagePairs"] as const,
  languages: ["languages"] as const,
  progress: ["progress"] as const,
  stories: (filters?: {
    cefr_level?: string;
    category_slug?: string;
    search?: string;
  }) => ["stories", filters] as const,
  story: (id: number | string) => ["story", id] as const,
};

export function useStories(filters?: {
  cefr_level?: string;
  category_slug?: string;
  search?: string;
}) {
  return useQuery({
    queryFn: () => api.getStories(filters),
    queryKey: queryKeys.stories(filters),
  });
}

export function useStory(id: number | string) {
  return useQuery({
    enabled: !!id,
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

export function useAllFlashcards() {
  return useQuery({
    queryFn: () => api.getAllFlashcards(),
    queryKey: queryKeys.flashcards,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storyId: number) => api.toggleFavorite(storyId),
    onSuccess: (_, storyId) => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.story(storyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}

export function useSaveFlashcard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vocabularyId: number) => api.saveFlashcard(vocabularyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}

export function useReviewFlashcard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      flashcardId,
      quality,
    }: {
      flashcardId: number;
      quality: number;
    }) => api.reviewFlashcard(flashcardId, quality),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}

export function useSubmitQuiz(storyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: QuizAnswerSubmission[]) =>
      api.submitQuiz(storyId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.story(storyId) });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}

export function useGenerateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StoryGeneratePayload) => api.generateStory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}
