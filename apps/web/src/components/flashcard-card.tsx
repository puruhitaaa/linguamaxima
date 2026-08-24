import { Button } from "@linguamaxima/ui/components/button";
import { RotateCw } from "lucide-react";
import { useState } from "react";

import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import type { Flashcard } from "../types/api";

interface FlashcardCardProps {
  card: Flashcard;
  onRate: (quality: number) => void;
  isSubmitting?: boolean;
}

const GENDER_BADGE_STYLE: Record<string, string> = {
  der: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  die: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  das: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export function FlashcardCard({
  card,
  onRate,
  isSubmitting,
}: FlashcardCardProps) {
  const { t } = useTranslation();
  const { originLanguage } = useLanguagePair();
  const [isFlipped, setIsFlipped] = useState(false);
  const vocab = card.vocabulary;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleFlip();
    }
  };

  const handleRate = (e: React.MouseEvent, quality: number) => {
    e.stopPropagation();
    setIsFlipped(false);
    onRate(quality);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* 3D Flip Card Container */}
      <button
        type="button"
        tabIndex={0}
        aria-label={t("flashcards.flipFrontPrompt", {
          origin: originLanguage.name,
        })}
        className="relative h-80 sm:h-96 w-full cursor-pointer perspective-1000 select-none block p-0 bg-transparent border-0 text-left"
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d rounded-2xl ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col justify-between items-center text-center shadow-xl hover:border-neutral-700 transition-colors">
            <div className="w-full flex items-center justify-between">
              {vocab.gender ? (
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${
                    GENDER_BADGE_STYLE[vocab.gender] ||
                    "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {vocab.gender}
                </span>
              ) : (
                <span />
              )}
              {vocab.part_of_speech && (
                <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                  {vocab.part_of_speech}
                </span>
              )}
            </div>

            <div className="space-y-3 my-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {vocab.word}
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                {t("flashcards.flipFrontPrompt", {
                  origin: originLanguage.name,
                })}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
              <RotateCw className="size-3.5" />
              <span>{t("flashcards.clickToFlip")}</span>
            </div>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-neutral-900 border border-sky-500/30 rounded-2xl p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-xl shadow-sky-500/5">
            <div className="w-full flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">
                  {vocab.word}
                </span>
                {vocab.gender && (
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
                      GENDER_BADGE_STYLE[vocab.gender] ||
                      "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {vocab.gender}
                  </span>
                )}
              </div>
              {vocab.part_of_speech && (
                <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                  {vocab.part_of_speech}
                </span>
              )}
            </div>

            <div className="space-y-4 my-auto">
              <div>
                <span className="text-xs text-neutral-400 uppercase tracking-wider font-bold block mb-1">
                  {t("flashcards.meaningLabel", {
                    origin: originLanguage.name,
                  })}
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-sky-400">
                  {vocab.translation}
                </p>
              </div>

              {vocab.example_sentence && (
                <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl text-left space-y-1 max-w-md">
                  <p className="text-xs sm:text-sm text-neutral-200 italic font-medium">
                    &ldquo;{vocab.example_sentence}&rdquo;
                  </p>
                  {vocab.example_translation && (
                    <p className="text-xs text-neutral-400">
                      {vocab.example_translation}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-neutral-500">
              {t("flashcards.ratePrompt")}
            </div>
          </div>
        </div>
      </button>

      {/* SM-2 Rating Controls */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Button
          type="button"
          onClick={(e) => handleRate(e, 0)}
          disabled={isSubmitting}
          className="flex flex-col h-auto py-2.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/60 hover:text-white transition-all rounded-xl"
        >
          <span className="text-xs sm:text-sm font-bold">
            {t("flashcards.again")}
          </span>
          <span className="text-[10px] text-rose-400/80">
            {t("flashcards.againInterval")}
          </span>
        </Button>

        <Button
          type="button"
          onClick={(e) => handleRate(e, 3)}
          disabled={isSubmitting}
          className="flex flex-col h-auto py-2.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:bg-amber-900/60 hover:text-white transition-all rounded-xl"
        >
          <span className="text-xs sm:text-sm font-bold">
            {t("flashcards.hard")}
          </span>
          <span className="text-[10px] text-amber-400/80">
            {t("flashcards.hardInterval")}
          </span>
        </Button>

        <Button
          type="button"
          onClick={(e) => handleRate(e, 4)}
          disabled={isSubmitting}
          className="flex flex-col h-auto py-2.5 bg-sky-950/40 border border-sky-500/30 text-sky-300 hover:bg-sky-900/60 hover:text-white transition-all rounded-xl"
        >
          <span className="text-xs sm:text-sm font-bold">
            {t("flashcards.good")}
          </span>
          <span className="text-[10px] text-sky-400/80">
            {card.interval_days > 0
              ? t("flashcards.goodInterval", { days: card.interval_days * 2 })
              : t("flashcards.hardInterval")}
          </span>
        </Button>

        <Button
          type="button"
          onClick={(e) => handleRate(e, 5)}
          disabled={isSubmitting}
          className="flex flex-col h-auto py-2.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 hover:text-white transition-all rounded-xl"
        >
          <span className="text-xs sm:text-sm font-bold">
            {t("flashcards.easy")}
          </span>
          <span className="text-[10px] text-emerald-400/80">
            {card.interval_days > 0
              ? t("flashcards.easyInterval", {
                  days: Math.round(card.interval_days * 2.5),
                })
              : t("flashcards.easyInterval", { days: 4 })}
          </span>
        </Button>
      </div>
    </div>
  );
}
