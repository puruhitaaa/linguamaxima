import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { api } from "../../lib/api";
import { LanguagePairProvider } from "../../lib/language-context";
import type { VocabularyItem } from "../../types/api";
import { InteractiveStoryText } from "../interactive-story-text";

function renderStoryText({
  content,
  onWordClick,
  vocabulary = [],
}: {
  content: string;
  onWordClick?: (pIdx: number, wIdx: number) => void;
  vocabulary?: VocabularyItem[];
}) {
  localStorage.setItem("linguamaxima_origin_lang", "en");
  vi.spyOn(api, "getLanguages").mockResolvedValue([]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguagePairProvider>
        <InteractiveStoryText
          content={content}
          originLanguageName="English"
          targetLanguageCode="de"
          showTranslation={false}
          vocabulary={vocabulary}
          onWordClick={onWordClick}
        />
      </LanguagePairProvider>
    </QueryClientProvider>
  );
}

describe("InteractiveStoryText", () => {
  it("matches inflected story words via stem/prefix fallback", () => {
    renderStoryText({
      content: "Wir reisten schnell.",
      vocabulary: [
        {
          difficulty_rank: 1,
          id: 1,
          story_id: 1,
          translation: "to travel",
          word: "reisen",
        },
      ],
    });

    const wordTrigger = screen.getByRole("button", { name: "reisten" });
    expect(wordTrigger).toBeInTheDocument();
    fireEvent.click(wordTrigger);
    expect(screen.getByText("to travel")).toBeInTheDocument();
  });

  it("opens dictionary lookup popover on non-vocab words before seeking audio", async () => {
    const onWordClick = vi.fn();
    const wordsSpy = vi.spyOn(api, "getWords").mockResolvedValueOnce({
      items: [
        {
          created_at: "2026-11-10T00:00:00Z",
          id: 55,
          language_id: 1,
          lemma: "schnell",
          native_level: "A1",
          normalized_level: "A1",
          part_of_speech: "adverb",
          translation: "fast",
        },
      ],
      page: 1,
      page_size: 5,
      total: 1,
      total_pages: 1,
    });

    renderStoryText({
      content: "Wir gehen schnell.",
      onWordClick,
    });

    fireEvent.click(screen.getByRole("button", { name: "schnell." }));
    expect(onWordClick).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(wordsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          lang: "de",
          search: "schnell",
        })
      );
    });

    expect(await screen.findByText("fast")).toBeInTheDocument();
    const playFromHereBtn = screen.getByRole("button", {
      name: /Play audio from here/iu,
    });
    fireEvent.click(playFromHereBtn);
    expect(onWordClick).toHaveBeenCalledWith(0, 2);
  });
});
