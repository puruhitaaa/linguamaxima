import { Button } from "@linguamaxima/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@linguamaxima/ui/components/popover";
import { Bookmark, Check } from "lucide-react";
import { useMemo } from "react";

import { useTranslation } from "../lib/i18n";
import { useSaveFlashcard } from "../lib/queries";
import type { VocabularyItem } from "../types/api";

interface InteractiveStoryTextProps {
  content: string;
  contentTranslated?: string;
  originLanguageName?: string;
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
  showTranslation,
  vocabulary,
}: InteractiveStoryTextProps) {
  const { t } = useTranslation();
  const saveFlashcardMutation = useSaveFlashcard();

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

  const handleSaveToDeck = (vocabId: number) => {
    saveFlashcardMutation.mutate(vocabId);
  };

  return (
    <article className="space-y-8 font-sans leading-relaxed text-neutral-100">
      {paragraphs.map((para, pIdx) => {
        const words = para.split(/\s+/u);
        const transPara = translatedParagraphs[pIdx];

        return (
          <div
            key={pIdx}
            className="p-6 sm:p-8 rounded-3xl bg-neutral-900/30 border border-neutral-800/60 hover:border-neutral-700/60 transition-colors space-y-4 shadow-sm"
          >
            {/* Target Language Paragraph with interactive vocabulary highlights */}
            <p className="text-lg sm:text-xl font-normal leading-loose tracking-wide text-white selection:bg-sky-500/40 selection:text-white">
              {words.map((rawWord, wIdx) => {
                const cleaned = cleanWord(rawWord);
                const vocabItem = vocabMap.get(cleaned.toLowerCase());

                if (!vocabItem) {
                  return (
                    <span key={wIdx} className="inline-block mr-1.5">
                      {rawWord}
                    </span>
                  );
                }

                // Render accessible Popover trigger only for actual vocabulary terms
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
                                    GENDER_BADGE_STYLE[
                                      vocabItem.gender.toLowerCase()
                                    ] ||
                                    "bg-neutral-800 text-neutral-300 border-neutral-700"
                                  }`}
                                >
                                  {vocabItem.gender}
                                </span>
                              )}
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
              })}
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
