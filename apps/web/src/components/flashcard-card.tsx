import { Button } from "@linguamaxima/ui/components/button";
import { Eye, EyeOff, RotateCw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../lib/api";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import type { Flashcard } from "../types/api";

interface FlashcardCardProps {
  card: Flashcard;
  onRate: (quality: number) => void;
  isSubmitting?: boolean;
}

function getGenderBadge(gender?: string | null) {
  if (!gender) {
    return null;
  }
  const g = gender.toLowerCase().trim();
  if (["der", "el", "le", "masculine", "m", "masc"].includes(g)) {
    return {
      label: gender,
      className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    };
  }
  if (["die", "la", "feminine", "f", "fem"].includes(g)) {
    return {
      label: gender,
      className: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    };
  }
  if (["das", "lo", "neuter", "n", "neut"].includes(g)) {
    return {
      label: gender,
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  }
  return {
    label: gender,
    className: "bg-neutral-800 text-neutral-300 border-neutral-700",
  };
}

export function FlashcardCard({
  card,
  onRate,
  isSubmitting,
}: FlashcardCardProps) {
  const { t } = useTranslation();
  const { originLanguage, targetLanguage } = useLanguagePair();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const vocab = card.vocabulary;
  const genderBadge = getGenderBadge(vocab.gender);
  const mediaAudioUrl = api.getMediaUrl(vocab.pronunciation_url);

  // Play pronunciation via server audio or speech synthesis fallback
  const playAudio = useCallback(async () => {
    if (mediaAudioUrl) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        try {
          await audioRef.current.play();
          setIsPlayingAudio(true);
        } catch {
          setIsPlayingAudio(false);
        }
      }
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(vocab.word);
      if (targetLanguage?.code) {
        utterance.lang = targetLanguage.code;
      }
      utterance.addEventListener("start", () => setIsPlayingAudio(true), {
        once: true,
      });
      utterance.addEventListener("end", () => setIsPlayingAudio(false), {
        once: true,
      });
      utterance.addEventListener("error", () => setIsPlayingAudio(false), {
        once: true,
      });
      window.speechSynthesis.speak(utterance);
    }
  }, [mediaAudioUrl, vocab.word, targetLanguage]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRate = useCallback(
    (quality: number) => {
      if (isSubmitting) {
        return;
      }
      setIsFlipped(false);
      setShowSentenceTranslation(false);
      onRate(quality);
    },
    [isSubmitting, onRate]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        playAudio();
      } else if (isFlipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate(0); // Again
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate(3); // Hard
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate(4); // Good
        } else if (e.key === "4") {
          e.preventDefault();
          handleRate(5); // Easy
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, handleFlip, handleRate, playAudio]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Hidden audio element for neural TTS */}
      {mediaAudioUrl && (
        <audio
          ref={audioRef}
          src={mediaAudioUrl}
          preload="auto"
          onPlay={() => setIsPlayingAudio(true)}
          onEnded={() => setIsPlayingAudio(false)}
          onError={() => setIsPlayingAudio(false)}
        >
          <track kind="captions" />
        </audio>
      )}

      {/* 3D Flip Card Container */}
      <section
        aria-live="polite"
        aria-label={t("flashcards.title")}
        className="relative h-88 sm:h-96 w-full select-none perspective-1000"
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d rounded-2xl ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT FACE */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-xl hover:border-neutral-700 transition-colors">
            {/* Top Meta Bar */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                {genderBadge ? (
                  <span
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${genderBadge.className}`}
                  >
                    {genderBadge.label}
                  </span>
                ) : (
                  <span />
                )}
              </div>

              <div className="flex items-center gap-2">
                {vocab.part_of_speech && (
                  <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                    {vocab.part_of_speech}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("flashcards.playPronunciation")}
                  title={t("flashcards.playPronunciation")}
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio();
                  }}
                  className={`size-8 p-0 rounded-full text-neutral-400 hover:text-sky-400 hover:bg-neutral-800 cursor-pointer ${
                    isPlayingAudio
                      ? "text-sky-400 bg-sky-500/10 animate-pulse"
                      : ""
                  }`}
                >
                  <Volume2 className="size-4" />
                </Button>
              </div>
            </div>

            {/* Target Word Center Stage */}
            <button
              type="button"
              onClick={handleFlip}
              className="space-y-3 my-auto cursor-pointer p-4 rounded-2xl hover:bg-neutral-800/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {vocab.word}
              </h2>
              <p className="text-xs text-neutral-400 font-medium">
                {t("flashcards.flipFrontPrompt", {
                  origin: originLanguage.name,
                })}
              </p>
            </button>

            {/* Bottom Flip Trigger */}
            <div className="w-full flex items-center justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlip();
                }}
                className="gap-2 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <RotateCw className="size-3.5" />
                <span>{t("flashcards.showAnswer")}</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded text-neutral-400">
                  Space
                </kbd>
              </Button>
            </div>
          </div>

          {/* BACK FACE */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-neutral-900 border border-sky-500/30 rounded-2xl p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-xl shadow-sky-500/5">
            {/* Top Meta Bar */}
            <div className="w-full flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">
                  {vocab.word}
                </span>
                {genderBadge && (
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded border ${genderBadge.className}`}
                  >
                    {genderBadge.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {vocab.part_of_speech && (
                  <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                    {vocab.part_of_speech}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("flashcards.playPronunciation")}
                  title={t("flashcards.playPronunciation")}
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio();
                  }}
                  className={`size-8 p-0 rounded-full text-neutral-400 hover:text-sky-400 hover:bg-neutral-800 cursor-pointer ${
                    isPlayingAudio
                      ? "text-sky-400 bg-sky-500/10 animate-pulse"
                      : ""
                  }`}
                >
                  <Volume2 className="size-4" />
                </Button>
              </div>
            </div>

            {/* Translation & Example Center */}
            <div className="space-y-4 my-auto w-full max-w-md">
              <div>
                <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold block mb-1">
                  {t("flashcards.meaningLabel", {
                    origin: originLanguage.name,
                  })}
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-sky-400">
                  {vocab.translation}
                </p>
              </div>

              {/* Example Sentence with Progressive Disclosure */}
              {vocab.example_sentence && (
                <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl text-left space-y-1.5">
                  <p className="text-xs sm:text-sm text-neutral-200 italic font-medium leading-relaxed">
                    &ldquo;{vocab.example_sentence}&rdquo;
                  </p>

                  {vocab.example_translation && (
                    <div className="pt-1 border-t border-neutral-800/60 flex items-center justify-between gap-2">
                      {showSentenceTranslation ? (
                        <p className="text-xs text-neutral-400">
                          {vocab.example_translation}
                        </p>
                      ) : (
                        <span className="text-xs text-neutral-500 italic">
                          ••••••••••••••••••
                        </span>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowSentenceTranslation(!showSentenceTranslation)
                        }
                        className="h-6 px-1.5 text-xs text-neutral-400 hover:text-neutral-200 shrink-0 gap-1 cursor-pointer"
                      >
                        {showSentenceTranslation ? (
                          <>
                            <EyeOff className="size-3" />
                            <span>
                              {t("flashcards.hideExampleTranslation")}
                            </span>
                          </>
                        ) : (
                          <>
                            <Eye className="size-3" />
                            <span>
                              {t("flashcards.showExampleTranslation")}
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rate Prompt */}
            <div className="text-xs text-neutral-400 font-medium">
              {t("flashcards.ratePrompt")}
            </div>
          </div>
        </div>
      </section>

      {/* RATING CONTROLS: Revealed only after flipping */}
      {isFlipped ? (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Button
              type="button"
              onClick={() => handleRate(0)}
              disabled={isSubmitting}
              className="flex flex-col min-h-12 py-2 px-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/60 hover:text-white transition-all rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold">
                  {t("flashcards.again")}
                </span>
                <kbd className="text-xs font-mono px-1 py-0.2 bg-rose-900/40 rounded text-rose-300">
                  1
                </kbd>
              </div>
              <span className="text-xs text-rose-400/80">
                {t("flashcards.againInterval")}
              </span>
            </Button>

            <Button
              type="button"
              onClick={() => handleRate(3)}
              disabled={isSubmitting}
              className="flex flex-col min-h-12 py-2 px-3 bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:bg-amber-900/60 hover:text-white transition-all rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold">
                  {t("flashcards.hard")}
                </span>
                <kbd className="text-xs font-mono px-1 py-0.2 bg-amber-900/40 rounded text-amber-300">
                  2
                </kbd>
              </div>
              <span className="text-xs text-amber-400/80">
                {t("flashcards.hardInterval")}
              </span>
            </Button>

            <Button
              type="button"
              onClick={() => handleRate(4)}
              disabled={isSubmitting}
              className="flex flex-col min-h-12 py-2 px-3 bg-sky-950/40 border border-sky-500/30 text-sky-300 hover:bg-sky-900/60 hover:text-white transition-all rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold">
                  {t("flashcards.good")}
                </span>
                <kbd className="text-xs font-mono px-1 py-0.2 bg-sky-900/40 rounded text-sky-300">
                  3
                </kbd>
              </div>
              <span className="text-xs text-sky-400/80">
                {card.interval_days > 0
                  ? t("flashcards.goodInterval", {
                      days: Math.max(1, card.interval_days * 2),
                    })
                  : t("flashcards.hardInterval")}
              </span>
            </Button>

            <Button
              type="button"
              onClick={() => handleRate(5)}
              disabled={isSubmitting}
              className="flex flex-col min-h-12 py-2 px-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 hover:text-white transition-all rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold">
                  {t("flashcards.easy")}
                </span>
                <kbd className="text-xs font-mono px-1 py-0.2 bg-emerald-900/40 rounded text-emerald-300">
                  4
                </kbd>
              </div>
              <span className="text-xs text-emerald-400/80">
                {card.interval_days > 0
                  ? t("flashcards.easyInterval", {
                      days: Math.round(card.interval_days * 2.5),
                    })
                  : t("flashcards.easyInterval", { days: 4 })}
              </span>
            </Button>
          </div>

          <p className="text-center text-xs text-neutral-400 font-mono">
            {t("flashcards.keyboardShortcutsHint")}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
          <span>{t("flashcards.clickToFlip")}</span>
        </div>
      )}
    </div>
  );
}
