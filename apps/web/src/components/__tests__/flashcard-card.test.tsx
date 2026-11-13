import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { api } from "../../lib/api";
import { playPronunciationAudio } from "../../lib/audio";
import { LanguagePairProvider } from "../../lib/language-context";
import type { Flashcard } from "../../types/api";
import { FlashcardCard } from "../flashcard-card";

vi.mock("../../lib/audio", () => ({
  playPronunciationAudio: vi.fn().mockResolvedValue(vi.fn()),
}));

function renderFlashcard(card: Flashcard, onRate = vi.fn()) {
  localStorage.setItem("linguamaxima_origin_lang", "en");
  localStorage.setItem("linguamaxima_target_lang", "de");
  vi.spyOn(api, "getLanguages").mockResolvedValue([]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguagePairProvider>
        <FlashcardCard card={card} onRate={onRate} />
      </LanguagePairProvider>
    </QueryClientProvider>
  );
}

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    created_at: "2026-11-10T00:00:00Z",
    ease_factor: 2.5,
    id: 7,
    interval_days: 6,
    next_review: "2026-11-13T00:00:00Z",
    repetitions: 2,
    vocabulary: {
      difficulty_rank: 1,
      id: 99,
      story_id: 3,
      story_language_code: "ja",
      translation: "train",
      word: "電車",
    },
    vocabulary_id: 99,
    ...overrides,
  };
}

describe("FlashcardCard", () => {
  it("displays SM-2 aligned interval previews after flipping", () => {
    renderFlashcard(
      makeCard({ ease_factor: 2.5, interval_days: 6, repetitions: 2 })
    );

    fireEvent.click(screen.getByRole("button", { name: /Show Answer/iu }));

    expect(screen.getAllByText("15 days")).toHaveLength(3);
  });

  it("shows 6 days preview on second repetition and 1 day on first repetition", () => {
    const firstRender = renderFlashcard(
      makeCard({ interval_days: 1, repetitions: 1 })
    );
    fireEvent.click(screen.getByRole("button", { name: /Show Answer/iu }));
    expect(screen.getAllByText("6 days")).toHaveLength(3);
    firstRender.unmount();

    renderFlashcard(makeCard({ id: 8, interval_days: 0, repetitions: 0 }));
    fireEvent.click(screen.getByRole("button", { name: /Show Answer/iu }));
    expect(screen.getAllByText("1 day")).toHaveLength(3);
  });

  it("plays pronunciation using the card's story_language_code", async () => {
    const playMock = vi.mocked(playPronunciationAudio);
    playMock.mockClear();

    renderFlashcard(makeCard());

    const playButtons = screen.getAllByRole("button", {
      name: /Listen to pronunciation/iu,
    });
    fireEvent.click(playButtons[0] as HTMLElement);

    await waitFor(() => {
      expect(playMock).toHaveBeenCalledWith(
        expect.objectContaining({
          languageCode: "ja",
          word: "電車",
        })
      );
    });
  });
});
