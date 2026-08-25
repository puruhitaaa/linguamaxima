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
  activeParagraphIndex?: number | null;
  activeWordIndex?: number | null;
  highlightWords?: boolean;
  highlightStoryItem?: boolean;
  isPlaying?: boolean;
  onWordClick?: (paragraphIndex: number, wordIndex: number) => void;
  onStoryItemClick?: (paragraphIndex: number) => void;
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
    activeBorder:
      "border-sky-400 ring-2 ring-sky-500/40 shadow-[0_0_24px_rgba(56,189,248,0.22)] bg-neutral-900/80",
    avatarBg: "bg-sky-500/20 text-sky-300",
    indicator: "bg-sky-400",
  },
  {
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    border: "border-purple-500/20 hover:border-purple-500/40",
    activeBorder:
      "border-purple-400 ring-2 ring-purple-500/40 shadow-[0_0_24px_rgba(192,132,252,0.22)] bg-neutral-900/80",
    avatarBg: "bg-purple-500/20 text-purple-300",
    indicator: "bg-purple-400",
  },
  {
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    activeBorder:
      "border-emerald-400 ring-2 ring-emerald-500/40 shadow-[0_0_24px_rgba(52,211,153,0.22)] bg-neutral-900/80",
    avatarBg: "bg-emerald-500/20 text-emerald-300",
    indicator: "bg-emerald-400",
  },
  {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    border: "border-amber-500/20 hover:border-amber-500/40",
    activeBorder:
      "border-amber-400 ring-2 ring-amber-500/40 shadow-[0_0_24px_rgba(251,191,36,0.22)] bg-neutral-900/80",
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

interface StoryWordProps {
  rawWord: string;
  wordIndex: number;
  paragraphIndex: number;
  vocabItem?: VocabularyItem;
  isActive: boolean;
  originLanguageName?: string;
  playingWord: string | null;
  onPlayWord: (url?: string | null, word?: string) => void;
  onSaveToDeck: (vocabId: number) => void;
  isSavingFlashcard: boolean;
  onWordClick?: (paragraphIndex: number, wordIndex: number) => void;
}

function StoryWordItem({
  rawWord,
  wordIndex,
  paragraphIndex,
  vocabItem,
  isActive,
  originLanguageName,
  playingWord,
  onPlayWord,
  onSaveToDeck,
  isSavingFlashcard,
  onWordClick,
}: StoryWordProps) {
  const { t } = useTranslation();

  if (!vocabItem) {
    return (
      <button
        type="button"
        onClick={() => onWordClick?.(paragraphIndex, wordIndex)}
        className={`inline-block mr-1.5 rounded transition-all duration-150 text-left cursor-pointer ${
          isActive
            ? "bg-sky-400 text-neutral-950 font-bold px-1.5 py-0.5 shadow-md ring-2 ring-sky-300/90 scale-105"
            : "hover:text-sky-200"
        }`}
      >
        {rawWord}
      </button>
    );
  }

  return (
    <span className="inline-block mr-1.5">
      <Popover>
        <PopoverTrigger
          type="button"
          className={`inline rounded cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-950 ${
            isActive
              ? "bg-sky-400 text-neutral-950 font-bold px-1.5 py-0.5 shadow-md ring-2 ring-sky-300/90 scale-105 underline decoration-neutral-950/70 decoration-2 underline-offset-4"
              : "px-1 py-0.5 font-semibold text-sky-300 underline decoration-sky-500/60 decoration-2 underline-offset-4 hover:text-sky-200 hover:decoration-sky-400 hover:bg-sky-500/15"
          }`}
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
                    onPlayWord(vocabItem.pronunciation_url, vocabItem.word)
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
            onClick={() => onSaveToDeck(vocabItem.id)}
            disabled={vocabItem.is_saved_as_flashcard || isSavingFlashcard}
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
}

interface DialogueCardProps {
  paragraphIndex: number;
  speakerName: string;
  spokenText: string;
  transText?: string;
  speakerIdx: number;
  shouldHighlightOutline: boolean;
  showTranslation: boolean;
  originLanguageName?: string;
  renderWords: (text: string, pIdx: number) => React.ReactNode;
  onStoryItemClick?: (pIdx: number) => void;
}

function DialogueStoryCard({
  paragraphIndex,
  speakerName,
  spokenText,
  transText,
  speakerIdx,
  shouldHighlightOutline,
  showTranslation,
  originLanguageName,
  renderWords,
  onStoryItemClick,
}: DialogueCardProps) {
  const { t } = useTranslation();
  const palette = SPEAKER_PALETTES[speakerIdx % SPEAKER_PALETTES.length] ??
    SPEAKER_PALETTES[0] ?? {
      badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      border: "border-sky-500/20 hover:border-sky-500/40",
      activeBorder: "border-sky-400 ring-2 ring-sky-500/40 bg-neutral-900/80",
      avatarBg: "bg-sky-500/20 text-sky-300",
      indicator: "bg-sky-400",
    };

  const cardBorderClass = shouldHighlightOutline
    ? palette.activeBorder
    : `${palette.border} bg-neutral-900/40`;

  return (
    <div
      className={`p-5 sm:p-7 rounded-3xl border transition-all duration-300 space-y-3.5 shadow-sm relative ${cardBorderClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`size-7 rounded-full flex items-center justify-center font-bold text-xs ${palette.avatarBg} ${
              shouldHighlightOutline
                ? "ring-2 ring-sky-400/80 animate-pulse"
                : ""
            }`}
          >
            {speakerName.charAt(0).toUpperCase()}
          </div>
          <span
            className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${palette.badge}`}
          >
            {speakerName}
          </span>

          {shouldHighlightOutline && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 bg-sky-500/20 border border-sky-400/40 px-2.5 py-0.5 rounded-full animate-pulse">
              <Volume2 className="size-3" />
              <span>{t("story.dictatingIndicator")}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onStoryItemClick && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t("story.clickToPlaySection")}
              title={t("story.clickToPlaySection")}
              onClick={() => onStoryItemClick(paragraphIndex)}
              className="size-7 p-0 rounded-full text-neutral-400 hover:text-sky-400 hover:bg-neutral-800 cursor-pointer"
            >
              <Volume2 className="size-3.5" />
            </Button>
          )}
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <MessageSquare className="size-3.5" />
            <span>Turn {paragraphIndex + 1}</span>
          </div>
        </div>
      </div>

      <p className="text-lg sm:text-xl font-normal leading-loose tracking-wide text-white selection:bg-sky-500/40 selection:text-white pl-1">
        {renderWords(spokenText, paragraphIndex)}
      </p>

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

interface MonologueCardProps {
  paragraphIndex: number;
  paraText: string;
  transText?: string;
  shouldHighlightOutline: boolean;
  showTranslation: boolean;
  originLanguageName?: string;
  renderWords: (text: string, pIdx: number) => React.ReactNode;
  onStoryItemClick?: (pIdx: number) => void;
}

function MonologueStoryCard({
  paragraphIndex,
  paraText,
  transText,
  shouldHighlightOutline,
  showTranslation,
  originLanguageName,
  renderWords,
  onStoryItemClick,
}: MonologueCardProps) {
  const { t } = useTranslation();
  const monoBorderClass = shouldHighlightOutline
    ? "border-sky-400 ring-2 ring-sky-500/40 shadow-[0_0_24px_rgba(56,189,248,0.22)] bg-neutral-900/80"
    : "border-neutral-800/60 hover:border-neutral-700/60 bg-neutral-900/30";

  return (
    <div
      className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 space-y-4 shadow-sm relative ${monoBorderClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {shouldHighlightOutline && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 bg-sky-500/20 border border-sky-400/40 px-2.5 py-0.5 rounded-full animate-pulse">
              <Volume2 className="size-3" />
              <span>{t("story.dictatingIndicator")}</span>
            </span>
          )}
        </div>

        {onStoryItemClick && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t("story.clickToPlaySection")}
            title={t("story.clickToPlaySection")}
            onClick={() => onStoryItemClick(paragraphIndex)}
            className="size-7 p-0 rounded-full text-neutral-400 hover:text-sky-400 hover:bg-neutral-800 cursor-pointer ml-auto"
          >
            <Volume2 className="size-3.5" />
          </Button>
        )}
      </div>

      <p className="text-lg sm:text-xl font-normal leading-loose tracking-wide text-white selection:bg-sky-500/40 selection:text-white">
        {renderWords(paraText, paragraphIndex)}
      </p>

      {showTranslation && transText && (
        <div className="pt-3 border-t border-neutral-800/80 text-sm sm:text-base text-neutral-300 leading-relaxed italic bg-neutral-950/50 p-4 rounded-2xl border border-neutral-800/60">
          <span className="text-xs uppercase tracking-wider text-sky-400 font-bold block not-italic mb-1.5">
            {t("story.parallelTranslationHeader", {
              origin: originLanguageName || "",
            })}
          </span>
          <p>{transText}</p>
        </div>
      )}
    </div>
  );
}

export function InteractiveStoryText({
  content,
  contentTranslated,
  originLanguageName,
  targetLanguageCode = "de",
  showTranslation,
  vocabulary,
  activeParagraphIndex = null,
  activeWordIndex = null,
  highlightWords = true,
  highlightStoryItem = true,
  isPlaying = false,
  onWordClick,
  onStoryItemClick,
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

  const renderWords = (textToRender: string, paragraphIndex: number) => {
    const words = textToRender.split(/\s+/u);

    return words.map((rawWord, wIdx) => {
      const cleaned = cleanWord(rawWord);
      const vocabItem = vocabMap.get(cleaned.toLowerCase());
      const isWordActive =
        highlightWords &&
        activeParagraphIndex === paragraphIndex &&
        activeWordIndex === wIdx;

      return (
        <StoryWordItem
          key={wIdx}
          rawWord={rawWord}
          wordIndex={wIdx}
          paragraphIndex={paragraphIndex}
          vocabItem={vocabItem}
          isActive={isWordActive}
          originLanguageName={originLanguageName}
          playingWord={playingWord}
          onPlayWord={playWord}
          onSaveToDeck={handleSaveToDeck}
          isSavingFlashcard={saveFlashcardMutation.isPending}
          onWordClick={onWordClick}
        />
      );
    });
  };

  return (
    <article className="space-y-6 sm:space-y-8 font-sans leading-relaxed text-neutral-100">
      {paragraphs.map((para, pIdx) => {
        const transPara = translatedParagraphs[pIdx];
        const speakerMatch = para.match(SPEAKER_LINE_REGEX);
        const isItemActive =
          activeParagraphIndex === pIdx &&
          (isPlaying || activeParagraphIndex !== null);
        const shouldHighlightOutline = isItemActive && highlightStoryItem;

        if (speakerMatch?.groups?.speaker && speakerMatch.groups.text) {
          const speakerName = speakerMatch.groups.speaker.trim();
          const spokenText = speakerMatch.groups.text.trim();
          const speakerIdx = speakerIndexMap.get(speakerName) ?? 0;
          const transMatch = transPara?.match(SPEAKER_LINE_REGEX);
          const transText = transMatch?.groups?.text
            ? transMatch.groups.text.trim()
            : transPara;

          return (
            <DialogueStoryCard
              key={pIdx}
              paragraphIndex={pIdx}
              speakerName={speakerName}
              spokenText={spokenText}
              transText={transText}
              speakerIdx={speakerIdx}
              shouldHighlightOutline={shouldHighlightOutline}
              showTranslation={showTranslation}
              originLanguageName={originLanguageName}
              renderWords={renderWords}
              onStoryItemClick={onStoryItemClick}
            />
          );
        }

        return (
          <MonologueStoryCard
            key={pIdx}
            paragraphIndex={pIdx}
            paraText={para}
            transText={transPara}
            shouldHighlightOutline={shouldHighlightOutline}
            showTranslation={showTranslation}
            originLanguageName={originLanguageName}
            renderWords={renderWords}
            onStoryItemClick={onStoryItemClick}
          />
        );
      })}
    </article>
  );
}
