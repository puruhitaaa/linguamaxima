import { Button } from "@linguamaxima/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@linguamaxima/ui/components/popover";
import { Bookmark, Check, MessageSquare, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { playPronunciationAudio } from "../lib/audio";
import { useTranslation } from "../lib/i18n";
import { useSaveFlashcard } from "../lib/queries";
import type { VocabularyItem } from "../types/api";

const SPEAKER_LINE_REGEX = /^(?<speaker>[^:\n\r]{1,40}):\s*(?<text>[\s\S]+)$/u;

interface InteractiveStoryTextProps {
  content: string;
  contentTranslated?: string;
  originLanguageName?: string;
  targetLanguageCode?: string;
  showTranslation: boolean;
  vocabulary: VocabularyItem[];
}

export const GENDER_BADGE_STYLE: Record<string, string> = {
  das: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  der: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  die: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  el: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  la: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  le: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  un: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  une: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  m: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  f: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  n: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

const SPEAKER_PALETTES = [
  {
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    border: "border-sky-500/20 hover:border-sky-500/40",
    avatarBg: "bg-sky-500/20 text-sky-300",
    indicator: "bg-sky-400",
  },
  {
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    border: "border-purple-500/20 hover:border-purple-500/40",
    avatarBg: "bg-purple-500/20 text-purple-300",
    indicator: "bg-purple-400",
  },
  {
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    avatarBg: "bg-emerald-500/20 text-emerald-300",
    indicator: "bg-emerald-400",
  },
  {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    border: "border-amber-500/20 hover:border-amber-500/40",
    avatarBg: "bg-amber-500/20 text-amber-300",
    indicator: "bg-amber-400",
  },
];

/**
 * Strips leading/trailing punctuation while preserving internal accents, umlauts, and hyphens.
 */
export function cleanWord(raw: string) {
  return raw.replaceAll(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function InteractiveStoryText({
  content,
  contentTranslated,
  originLanguageName,
  targetLanguageCode = "de",
  showTranslation,
  vocabulary,
}: InteractiveStoryTextProps) {
  const { t } = useTranslation();
  const saveFlashcardMutation = useSaveFlashcard();
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const cancelAudioRef = useRef<(() => void) | null>(null);

  const playWord = useCallback(
    async (url?: string | null, word?: string) => {
      if (cancelAudioRef.current) {
        cancelAudioRef.current();
      }

      if (word) {
        setPlayingWord(word);
      }

      const cleanup = await playPronunciationAudio({
        url,
        word,
        languageCode: targetLanguageCode,
        onStart: () => {
          if (word) {
            setPlayingWord(word);
          }
        },
        onEnd: () => setPlayingWord(null),
        onError: () => setPlayingWord(null),
        t,
      });
      cancelAudioRef.current = cleanup;
    },
    [targetLanguageCode, t]
  );

  useEffect(
    () => () => {
      if (cancelAudioRef.current) {
        cancelAudioRef.current();
      }
    },
    []
  );

  // Map vocabulary for instant O(1) lookup by cleaned lowercase word
  const vocabMap = useMemo(() => {
    const map = new Map<string, VocabularyItem>();
    for (const v of vocabulary) {
      map.set(cleanWord(v.word).toLowerCase(), v);
    }
    return map;
  }, [vocabulary]);

  const paragraphs = useMemo(
    () => content.split("\n\n").filter((p) => p.trim().length > 0),
    [content]
  );
  const translatedParagraphs = useMemo(
    () =>
      contentTranslated
        ? contentTranslated.split("\n\n").filter((p) => p.trim().length > 0)
        : [],
    [contentTranslated]
  );

  // Identify unique speaker names to assign consistent color palettes
  const speakerIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let count = 0;
    for (const para of paragraphs) {
      const match = para.match(SPEAKER_LINE_REGEX);
      if (match?.groups?.speaker) {
        const speaker = match.groups.speaker.trim();
        if (!map.has(speaker)) {
          map.set(speaker, count);
          count += 1;
        }
      }
    }
    return map;
  }, [paragraphs]);

  const handleSaveToDeck = (vocabId: number) => {
    saveFlashcardMutation.mutate(vocabId);
  };

  const renderWordsWithPopovers = (textToRender: string) => {
    const words = textToRender.split(/\s+/u);

    return words.map((rawWord, wIdx) => {
      const cleaned = cleanWord(rawWord);
      const vocabItem = vocabMap.get(cleaned.toLowerCase());

      if (!vocabItem) {
        return (
          <span key={wIdx} className="inline-block mr-1.5">
            {rawWord}
          </span>
        );
      }

      return (
        <span key={wIdx} className="inline-block mr-1.5">
          <Popover>
            <PopoverTrigger
              type="button"
              className="inline rounded px-1 py-0.5 font-semibold text-sky-300 underline decoration-sky-500/60 decoration-2 underline-offset-4 hover:text-sky-200 hover:decoration-sky-400 hover:bg-sky-500/15 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-950"
            >
              {rawWord}
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="center"
              sideOffset={6}
              className="w-80 p-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 text-neutral-100 shadow-2xl rounded-2xl space-y-3"
            >
              <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">
                      {vocabItem.word}
                    </h4>
                    {vocabItem.gender && (
                      <span
                        className={`px-1.5 py-0.5 text-xs font-bold rounded-md border ${
                          GENDER_BADGE_STYLE[vocabItem.gender.toLowerCase()] ||
                          "bg-neutral-800 text-neutral-300 border-neutral-700"
                        }`}
                      >
                        {vocabItem.gender}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={t("flashcards.playPronunciation")}
                      title={t("flashcards.playPronunciation")}
                      onClick={() =>
                        playWord(vocabItem.pronunciation_url, vocabItem.word)
                      }
                      className={`size-6 p-0 rounded-full text-neutral-400 hover:text-sky-400 hover:bg-neutral-800 cursor-pointer ${
                        playingWord === vocabItem.word
                          ? "text-sky-400 bg-sky-500/10 animate-pulse"
                          : ""
                      }`}
                    >
                      <Volume2 className="size-3.5" />
                    </Button>
                  </div>
                  {vocabItem.part_of_speech && (
                    <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold block">
                      {vocabItem.part_of_speech}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-neutral-400 font-medium block">
                  {t("story.translationLabel", {
                    origin: originLanguageName || "",
                  })}
                </span>
                <p className="text-sm font-bold text-sky-400">
                  {vocabItem.translation}
                </p>
              </div>

              {vocabItem.example_sentence && (
                <div className="text-xs bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80 space-y-1">
                  <p className="text-neutral-200 font-medium italic">
                    &ldquo;{vocabItem.example_sentence}&rdquo;
                  </p>
                  {vocabItem.example_translation && (
                    <p className="text-neutral-400">
                      {vocabItem.example_translation}
                    </p>
                  )}
                </div>
              )}

              <Button
                size="sm"
                onClick={() => handleSaveToDeck(vocabItem.id)}
                disabled={
                  vocabItem.is_saved_as_flashcard ||
                  saveFlashcardMutation.isPending
                }
                className={`w-full text-xs font-semibold gap-1.5 h-9 rounded-xl ${
                  vocabItem.is_saved_as_flashcard
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                    : "bg-sky-500 hover:bg-sky-600 text-white shadow-sm"
                }`}
              >
                {vocabItem.is_saved_as_flashcard ? (
                  <>
                    <Check className="size-4" />
                    <span>{t("story.savedInDeck")}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="size-4" />
                    <span>{t("story.saveToFlashcards")}</span>
                  </>
                )}
              </Button>
            </PopoverContent>
          </Popover>
        </span>
      );
    });
  };

  return (
    <article className="space-y-6 sm:space-y-8 font-sans leading-relaxed text-neutral-100">
      {paragraphs.map((para, pIdx) => {
        const transPara = translatedParagraphs[pIdx];
        const speakerMatch = para.match(SPEAKER_LINE_REGEX);

        // Conversational Dialogue Card View
        if (speakerMatch?.groups?.speaker && speakerMatch.groups.text) {
          const speakerName = speakerMatch.groups.speaker.trim();
          const spokenText = speakerMatch.groups.text.trim();

          const speakerIdx = speakerIndexMap.get(speakerName) ?? 0;
          const palette =
            SPEAKER_PALETTES[speakerIdx % SPEAKER_PALETTES.length];

          // Parse translated speaker & text if parallel format matches
          const transMatch = transPara?.match(SPEAKER_LINE_REGEX);
          const transText = transMatch?.groups?.text
            ? transMatch.groups.text.trim()
            : transPara;

          return (
            <div
              key={pIdx}
              className={`p-5 sm:p-7 rounded-3xl bg-neutral-900/40 border ${palette.border} transition-all space-y-3.5 shadow-sm`}
            >
              {/* Speaker Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`size-7 rounded-full flex items-center justify-center font-bold text-xs ${palette.avatarBg}`}
                  >
                    {speakerName.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${palette.badge}`}
                  >
                    {speakerName}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <MessageSquare className="size-3.5" />
                  <span>Turn {pIdx + 1}</span>
                </div>
              </div>

              {/* Spoken Text */}
              <p className="text-lg sm:text-xl font-normal leading-loose tracking-wide text-white selection:bg-sky-500/40 selection:text-white pl-1">
                {renderWordsWithPopovers(spokenText)}
              </p>

              {/* Parallel Translation */}
              {showTranslation && transText && (
                <div className="pt-2.5 border-t border-neutral-800/70 text-sm sm:text-base text-neutral-300 leading-relaxed italic bg-neutral-950/40 p-3.5 rounded-2xl border border-neutral-800/50">
                  <span className="text-xs uppercase tracking-wider text-sky-400 font-bold block not-italic mb-1">
                    {speakerName} ({originLanguageName || "Translation"}):
                  </span>
                  <p>{transText}</p>
                </div>
              )}
            </div>
          );
        }

        // Standard Monologue / Narrative Paragraph View
        return (
          <div
            key={pIdx}
            className="p-6 sm:p-8 rounded-3xl bg-neutral-900/30 border border-neutral-800/60 hover:border-neutral-700/60 transition-colors space-y-4 shadow-sm"
          >
            {/* Target Language Paragraph with interactive vocabulary highlights */}
            <p className="text-lg sm:text-xl font-normal leading-loose tracking-wide text-white selection:bg-sky-500/40 selection:text-white">
              {renderWordsWithPopovers(para)}
            </p>

            {/* Parallel Translation */}
            {showTranslation && transPara && (
              <div className="pt-3 border-t border-neutral-800/80 text-sm sm:text-base text-neutral-300 leading-relaxed italic bg-neutral-950/50 p-4 rounded-2xl border border-neutral-800/60">
                <span className="text-xs uppercase tracking-wider text-sky-400 font-bold block not-italic mb-1.5">
                  {t("story.parallelTranslationHeader", {
                    origin: originLanguageName || "",
                  })}
                </span>
                <p>{transPara}</p>
              </div>
            )}
          </div>
        );
      })}
    </article>
  );
}
