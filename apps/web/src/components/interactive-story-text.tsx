import { Button } from "@linguamaxima/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@linguamaxima/ui/components/popover";
import { Bookmark, Check } from "lucide-react";
import { useState } from "react";

import { useSaveFlashcard } from "../lib/queries";
import type { VocabularyItem } from "../types/api";

interface InteractiveStoryTextProps {
  content: string;
  contentTranslated?: string;
  vocabulary: VocabularyItem[];
  showTranslation: boolean;
}

const GENDER_BADGE_STYLE: Record<string, string> = {
  das: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  der: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  die: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

function cleanWord(raw: string) {
  return raw.replaceAll(
    /^[.,/#!$%^&*;:{}=\-_`~()«»""''„“]+|[.,/#!$%^&*;:{}=\-_`~()«»""''„“]+$/gu,
    ""
  );
}

export function InteractiveStoryText({
  content,
  contentTranslated,
  vocabulary,
  showTranslation,
}: InteractiveStoryTextProps) {
  const saveFlashcardMutation = useSaveFlashcard();
  const [activeWordInfo, setActiveWordInfo] = useState<VocabularyItem | null>(
    null
  );
  const [activeRawWord, setActiveRawWord] = useState<string>("");

  // Map vocabulary for instant O(1) lookup by cleaned word
  const vocabMap = new Map<string, VocabularyItem>();
  for (const v of vocabulary) {
    vocabMap.set(v.word.toLowerCase(), v);
  }

  const paragraphs = content.split("\n\n").filter((p) => p.trim().length > 0);
  const translatedParagraphs = contentTranslated
    ? contentTranslated.split("\n\n").filter((p) => p.trim().length > 0)
    : [];

  const handleWordClick = (rawWord: string) => {
    const cleaned = cleanWord(rawWord);
    const vocab = vocabMap.get(cleaned.toLowerCase()) || null;
    setActiveRawWord(cleaned || rawWord);
    setActiveWordInfo(vocab);
  };

  const handleSaveToDeck = (vocabId: number) => {
    saveFlashcardMutation.mutate(vocabId);
  };

  return (
    <div className="space-y-8 font-sans leading-relaxed text-neutral-100">
      {paragraphs.map((para, pIdx) => {
        const words = para.split(/\s+/u);
        const transPara = translatedParagraphs[pIdx];

        return (
          <div
            key={pIdx}
            className="p-5 sm:p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 transition-all hover:border-neutral-700/80 space-y-4"
          >
            {/* German Paragraph with interactive words */}
            <p className="text-lg sm:text-xl font-normal leading-loose tracking-wide text-neutral-100 selection:bg-sky-500/30">
              {words.map((rawWord, wIdx) => {
                const cleaned = cleanWord(rawWord);
                const isVocab = vocabMap.has(cleaned.toLowerCase());

                return (
                  <span key={wIdx} className="inline-block mr-1.5">
                    <Popover>
                      <PopoverTrigger
                        type="button"
                        onClick={() => handleWordClick(rawWord)}
                        className={`inline rounded-sm px-0.5 transition-all text-left ${
                          isVocab
                            ? "font-medium text-sky-200 underline decoration-sky-500/50 decoration-2 underline-offset-4 hover:text-sky-300 hover:decoration-sky-400 hover:bg-sky-500/10 cursor-pointer"
                            : "hover:bg-neutral-800/80 hover:text-white cursor-pointer"
                        }`}
                      >
                        {rawWord}
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="center"
                        className="w-72 p-4 bg-neutral-900/95 backdrop-blur-md border-neutral-700 text-neutral-100 shadow-xl rounded-xl"
                      >
                        {activeWordInfo ? (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-white">
                                    {activeWordInfo.word}
                                  </h4>
                                  {activeWordInfo.gender && (
                                    <span
                                      className={`px-1.5 py-0.2 text-[11px] font-bold rounded border ${
                                        GENDER_BADGE_STYLE[
                                          activeWordInfo.gender
                                        ] ||
                                        "bg-neutral-800 text-neutral-300 border-neutral-700"
                                      }`}
                                    >
                                      {activeWordInfo.gender}
                                    </span>
                                  )}
                                </div>
                                {activeWordInfo.part_of_speech && (
                                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                                    {activeWordInfo.part_of_speech}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-xs text-neutral-400 block mb-0.5">
                                Indonesian Translation:
                              </span>
                              <p className="text-sm font-semibold text-sky-400">
                                {activeWordInfo.translation}
                              </p>
                            </div>

                            {activeWordInfo.example_sentence && (
                              <div className="text-xs bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/80 space-y-1">
                                <p className="text-neutral-200 font-medium italic">
                                  &ldquo;{activeWordInfo.example_sentence}
                                  &rdquo;
                                </p>
                                {activeWordInfo.example_translation && (
                                  <p className="text-neutral-400">
                                    {activeWordInfo.example_translation}
                                  </p>
                                )}
                              </div>
                            )}

                            <Button
                              size="sm"
                              onClick={() =>
                                handleSaveToDeck(activeWordInfo.id)
                              }
                              disabled={
                                activeWordInfo.is_saved_as_flashcard ||
                                saveFlashcardMutation.isPending
                              }
                              className={`w-full text-xs font-semibold gap-1.5 h-8 ${
                                activeWordInfo.is_saved_as_flashcard
                                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                                  : "bg-sky-500 hover:bg-sky-600 text-white"
                              }`}
                            >
                              {activeWordInfo.is_saved_as_flashcard ? (
                                <>
                                  <Check className="size-3.5" />
                                  Saved in Deck
                                </>
                              ) : (
                                <>
                                  <Bookmark className="size-3.5" />
                                  Save to Flashcards
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2 text-center py-1">
                            <h4 className="text-sm font-semibold text-white">
                              {activeRawWord}
                            </h4>
                            <p className="text-xs text-neutral-400">
                              Word meaning is available in the parallel story
                              translation below.
                            </p>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </span>
                );
              })}
            </p>

            {/* Parallel Indonesian Translation */}
            {showTranslation && transPara && (
              <div className="pt-3 border-t border-neutral-800/80 text-sm text-neutral-400 leading-relaxed italic bg-neutral-950/40 p-3 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-sky-400/80 font-bold block not-italic mb-1">
                  Terjemahan Indonesia:
                </span>
                {transPara}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
