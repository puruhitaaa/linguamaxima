import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { api } from "../../lib/api";
import { LanguagePairProvider } from "../../lib/language-context";
import { AudioPlayer } from "../audio-player";
import type { AudioPlayerHandle } from "../audio-player";

function renderAudioPlayer(
  ref?: React.Ref<AudioPlayerHandle>,
  audioUrl = "https://cdn.example.com/story.mp3"
) {
  localStorage.setItem("linguamaxima_origin_lang", "en");
  vi.spyOn(api, "getLanguages").mockResolvedValue([]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguagePairProvider>
        <div>
          <input aria-label="Search input" />
          <article tabIndex={-1}>Story body text</article>
          <AudioPlayer
            ref={ref}
            audioUrl={audioUrl}
            storyContent="Hallo Welt."
            storyTitle="Test Story"
          />
        </div>
      </LanguagePairProvider>
    </QueryClientProvider>
  );
}

describe("AudioPlayer", () => {
  it("syncs playbackRate on cycleSpeed and loadedmetadata", () => {
    renderAudioPlayer();
    const audio = document.querySelector("audio") as HTMLAudioElement;
    expect(audio).not.toBeNull();

    const speedBtn = screen.getByRole("button", { name: /Playback speed/iu });
    fireEvent.click(speedBtn);
    expect(audio.playbackRate).toBe(1.25);

    fireEvent.loadedMetadata(audio);
    expect(audio.playbackRate).toBe(1.25);
  });

  it("defers seekTo until loadedmetadata when audio metadata is not ready", async () => {
    const ref = createRef<AudioPlayerHandle>();
    renderAudioPlayer(ref);

    const audio = document.querySelector("audio") as HTMLAudioElement;
    const playMock = vi.fn(() => Promise.resolve());
    Object.defineProperty(audio, "play", { value: playMock });
    Object.defineProperty(audio, "readyState", {
      configurable: true,
      value: 0,
    });

    await act(async () => {
      await ref.current?.seekTo(12.5, true);
    });

    // ReadyState becomes 4 before loadedmetadata arrives
    Object.defineProperty(audio, "readyState", {
      configurable: true,
      value: 4,
    });
    fireEvent.loadedMetadata(audio);
    expect(audio.currentTime).toBe(12.5);
  });

  it("toggles playback on Spacebar from non-interactive elements but ignores inputs", () => {
    renderAudioPlayer();
    const audio = document.querySelector("audio") as HTMLAudioElement;
    const playMock = vi.fn(() => Promise.resolve());
    Object.defineProperty(audio, "play", { value: playMock });

    const input = screen.getByLabelText("Search input");
    fireEvent.keyDown(input, { code: "Space" });
    expect(playMock).not.toHaveBeenCalled();

    const article = screen.getByText("Story body text");
    act(() => {
      fireEvent.keyDown(article, { code: "Space" });
    });
    expect(playMock).toHaveBeenCalledTimes(1);
  });
});
