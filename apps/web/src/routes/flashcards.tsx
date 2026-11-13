import { Button } from "@linguamaxima/ui/components/button";
import { Input } from "@linguamaxima/ui/components/input";
import { Progress } from "@linguamaxima/ui/components/progress";
import { Tabs, TabsList, TabsTrigger } from "@linguamaxima/ui/components/tabs";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Globe,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { FlashcardCard } from "../components/flashcard-card";
import { playPronunciationAudio } from "../lib/audio";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import {
  useAllFlashcards,
  useDeleteFlashcard,
  useDueFlashcards,
  useReviewFlashcard,
} from "../lib/queries";
import type { Flashcard } from "../types/api";

const MASTERY_FILTERS = ["learning", "reviewing", "mastered"] as const;

const flashcardsSearchSchema = z.object({
  mastery: z.preprocess(
    (v) =>
      typeof v === "string" &&
      (MASTERY_FILTERS as readonly string[]).includes(v)
        ? v
        : undefined,
    z.enum(MASTERY_FILTERS).optional()
  ),
  scope: z.preprocess(
    (v) => (v === "pair" || v === "all" ? v : undefined),
    z.enum(["pair", "all"]).optional()
  ),
  search: z.string().optional(),
  tab: z.preprocess(
    (v) => (v === "review" || v === "deck" ? v : undefined),
    z.enum(["review", "deck"]).optional()
  ),
});

export const Route = createFileRoute("/flashcards")({
  component: FlashcardsComponent,
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = flashcardsSearchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
});

type MasteryFilter = "all" | "learning" | "reviewing" | "mastered";

function getMasteryTier(fc: Flashcard): "learning" | "reviewing" | "mastered" {
  if (fc.interval_days >= 7 && fc.repetitions >= 2) {
    return "mastered";
  }
  if (fc.interval_days >= 2) {
    return "reviewing";
  }
  return "learning";
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

function getFlashcardVocab(fc: Flashcard) {
  if (fc.vocabulary) {
    return {
      example_sentence: fc.vocabulary.example_sentence,
      example_translation: fc.vocabulary.example_translation,
      gender: fc.vocabulary.gender,
      part_of_speech: fc.vocabulary.part_of_speech,
      pronunciation_url: fc.vocabulary.pronunciation_url,
      story_id: fc.vocabulary.story_id,
      story_language_code: fc.vocabulary.story_language_code,
      translation: fc.vocabulary.translation,
      word: fc.vocabulary.word,
    };
  }
  if (fc.word) {
    return {
      example_sentence: fc.word.example_sentence || undefined,
      example_translation: fc.word.example_translation || undefined,
      gender: fc.word.gender as "der" | "die" | "das" | null,
      part_of_speech: fc.word.part_of_speech,
      pronunciation_url: fc.word.audio_url || undefined,
      story_id: undefined,
      story_language_code: undefined,
      translation: fc.word.translation,
      word: fc.word.lemma,
    };
  }
  if (fc.journey_vocabulary) {
    return {
      example_sentence: fc.journey_vocabulary.example_sentence || undefined,
      example_translation:
        fc.journey_vocabulary.example_translation || undefined,
      gender:
        (fc.journey_vocabulary.gender as "der" | "die" | "das" | null) ?? null,
      part_of_speech: fc.journey_vocabulary.part_of_speech || undefined,
      pronunciation_url: fc.journey_vocabulary.pronunciation_url || undefined,
      story_id: undefined,
      translation: fc.journey_vocabulary.translation,
      word: fc.journey_vocabulary.word,
    };
  }
  return {
    example_sentence: undefined,
    example_translation: undefined,
    gender: null,
    part_of_speech: undefined,
    pronunciation_url: undefined,
    story_id: undefined,
    story_language_code: undefined,
    translation: "",
    word: "",
  };
}

interface ReviewTabProps {
  dueCards?: Flashcard[];
  allCards?: Flashcard[];
  isLoadingDue: boolean;
  onBrowseDeck: () => void;
}

function FlashcardsReviewTab({
  dueCards,
  allCards,
  isLoadingDue,
  onBrowseDeck,
}: ReviewTabProps) {
  const { t } = useTranslation();
  const reviewMutation = useReviewFlashcard();

  const [customQueue, setCustomQueue] = useState<Flashcard[] | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, reviewed: 0 });

  const activeQueue = customQueue ?? dueCards ?? [];
  const currentCard = activeQueue[currentIdx];
  const isSessionComplete =
    activeQueue.length > 0 && currentIdx >= activeQueue.length;

  const handleRate = (quality: number) => {
    if (!currentCard) {
      return;
    }
    // Lock snapshot into customQueue and re-queue lapsed ("Again") cards in-session
    const baseQueue = customQueue ?? [...activeQueue];
    const nextQueue = quality < 3 ? [...baseQueue, currentCard] : baseQueue;
    setCustomQueue(nextQueue);
    reviewMutation.mutate({
      flashcardId: currentCard.id,
      quality,
    });
    setSessionStats((prev) => ({
      correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      reviewed: prev.reviewed + 1,
    }));
    setCurrentIdx((prev) => prev + 1);
  };

  const restartSession = () => {
    if (dueCards && dueCards.length > 0) {
      setCustomQueue([...dueCards]);
    } else if (allCards && allCards.length > 0) {
      setCustomQueue(allCards.slice(0, 20));
    }
    setCurrentIdx(0);
    setSessionStats({ correct: 0, reviewed: 0 });
  };

  if (isLoadingDue) {
    return (
      <div className="h-88 rounded-2xl bg-neutral-900/60 border border-neutral-800 animate-pulse max-w-xl mx-auto" />
    );
  }

  if (isSessionComplete) {
    const accuracy =
      sessionStats.reviewed > 0
        ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
        : 100;

    return (
      <div className="p-8 sm:p-12 text-center bg-neutral-900/40 border border-neutral-800 rounded-3xl space-y-6 max-w-lg mx-auto shadow-2xl">
        <div className="size-20 rounded-full mx-auto flex items-center justify-center bg-sky-500/10 border border-sky-500/30 text-sky-400">
          <Trophy className="size-10 text-sky-400" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t("flashcards.sessionCompleted")}
          </h3>
          <p className="text-sm text-neutral-400 max-w-sm mx-auto">
            {t("flashcards.sessionSummary", {
              accuracy,
              count: sessionStats.reviewed,
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold block mb-1">
              {t("flashcards.cardsReviewedCount")}
            </span>
            <span className="text-2xl font-extrabold text-white">
              {sessionStats.reviewed}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold block mb-1">
              {t("flashcards.accuracy")}
            </span>
            <span className="text-2xl font-extrabold text-sky-400">
              {accuracy}%
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={restartSession}
            className="w-full sm:w-auto border-neutral-700 text-neutral-300 hover:bg-neutral-800 rounded-xl gap-2 cursor-pointer"
          >
            <RotateCcw className="size-4" />
            <span>{t("flashcards.practiceAgain")}</span>
          </Button>
          <Link to="/">
            <Button className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2 rounded-xl cursor-pointer">
              <BookOpen className="size-4" />
              {t("flashcards.readMoreStories")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="p-8 sm:p-12 text-center bg-neutral-900/40 border border-neutral-800 rounded-3xl space-y-5 max-w-md mx-auto">
        <div className="size-16 rounded-full mx-auto flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="size-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white">
            {t("flashcards.caughtUpTitle")}
          </h3>
          <p className="text-sm text-neutral-400">
            {activeQueue.length === 0 && !allCards?.length
              ? t("flashcards.caughtUpEmptyDeck")
              : t("flashcards.caughtUpReviewDone")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button className="bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2 rounded-xl cursor-pointer">
              <BookOpen className="size-4" />
              {t("flashcards.readMoreStories")}
            </Button>
          </Link>
          {allCards && allCards.length > 0 && (
            <Button
              variant="outline"
              onClick={onBrowseDeck}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 rounded-xl cursor-pointer"
            >
              {t("flashcards.browseDeck")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(
    (currentIdx / (activeQueue.length || 1)) * 100
  );

  return (
    <div className="space-y-6">
      <div className="max-w-xl mx-auto space-y-2 px-1">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            {t("flashcards.dailyReview")}
          </span>
          <span className="font-mono text-neutral-300">
            {t("flashcards.cardOf", {
              current: currentIdx + 1,
              total: activeQueue.length,
            })}
          </span>
        </div>
        <Progress value={progressPercent} className="h-1.5 bg-neutral-800/80" />
      </div>

      <FlashcardCard
        key={currentCard.id}
        card={currentCard}
        onRate={handleRate}
        isSubmitting={reviewMutation.isPending}
      />
    </div>
  );
}

interface DeckTabProps {
  cards?: Flashcard[];
  deletingCardId?: number;
  isLoading: boolean;
  onDeleteCard: (flashcardId: number) => void;
  searchParam: string;
  searchInput: string;
  onSearchChange: (val: string) => void;
  masteryFilter: MasteryFilter;
  onFilterChange: (filter: MasteryFilter) => void;
}

function FlashcardsDeckTab({
  cards,
  deletingCardId,
  isLoading,
  onDeleteCard,
  searchParam,
  searchInput,
  onSearchChange,
  masteryFilter,
  onFilterChange,
}: DeckTabProps) {
  const { t } = useTranslation();
  const { targetLanguage } = useLanguagePair();

  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const cancelAudioRef = useRef<(() => void) | null>(null);

  const playWordAudio = useCallback(
    async (
      url?: string | null,
      word?: string,
      languageCode?: string | null
    ) => {
      if (cancelAudioRef.current) {
        cancelAudioRef.current();
      }

      if (word) {
        setPlayingWord(word);
      }

      const cleanup = await playPronunciationAudio({
        url,
        word,
        languageCode: languageCode || targetLanguage?.code || "de",
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
    [targetLanguage, t]
  );

  useEffect(
    () => () => {
      if (cancelAudioRef.current) {
        cancelAudioRef.current();
      }
    },
    []
  );

  const filteredCards = useMemo(() => {
    if (!cards) {
      return [];
    }
    if (masteryFilter === "all") {
      return cards;
    }
    return cards.filter((card) => getMasteryTier(card) === masteryFilter);
  }, [cards, masteryFilter]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-2xl bg-neutral-900 border border-neutral-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            type="button"
            variant={masteryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange("all")}
            className={`text-xs font-semibold rounded-xl h-8 px-3 cursor-pointer ${
              masteryFilter === "all"
                ? "bg-sky-500 hover:bg-sky-600 text-white"
                : "border-neutral-800 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {t("flashcards.filterAll")}
          </Button>
          <Button
            type="button"
            variant={masteryFilter === "learning" ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange("learning")}
            className={`text-xs font-semibold rounded-xl h-8 px-3 cursor-pointer ${
              masteryFilter === "learning"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "border-neutral-800 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {t("flashcards.masteryLearning")}
          </Button>
          <Button
            type="button"
            variant={masteryFilter === "reviewing" ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange("reviewing")}
            className={`text-xs font-semibold rounded-xl h-8 px-3 cursor-pointer ${
              masteryFilter === "reviewing"
                ? "bg-sky-500 hover:bg-sky-600 text-white"
                : "border-neutral-800 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {t("flashcards.masteryReviewing")}
          </Button>
          <Button
            type="button"
            variant={masteryFilter === "mastered" ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange("mastered")}
            className={`text-xs font-semibold rounded-xl h-8 px-3 cursor-pointer ${
              masteryFilter === "mastered"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "border-neutral-800 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {t("flashcards.masteryMastered")}
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
          <Input
            type="text"
            placeholder={t("flashcards.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-neutral-900 border-neutral-800 text-neutral-200 placeholder:text-neutral-500 rounded-xl"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((fc) => {
            const tier = getMasteryTier(fc);
            const vocab = getFlashcardVocab(fc);
            const genderBadge = getGenderBadge(vocab.gender);

            return (
              <div
                key={fc.id}
                className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex flex-col justify-between gap-3.5 hover:border-neutral-700 transition-all shadow-sm group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white tracking-tight">
                        {vocab.word}
                      </h4>
                      {genderBadge && (
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${genderBadge.className}`}
                        >
                          {genderBadge.label}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={t("flashcards.playPronunciation")}
                        title={t("flashcards.playPronunciation")}
                        onClick={() =>
                          playWordAudio(
                            vocab.pronunciation_url,
                            vocab.word,
                            vocab.story_language_code
                          )
                        }
                        className={`size-7 p-0 rounded-full text-neutral-400 hover:text-sky-400 hover:bg-neutral-800 cursor-pointer ${
                          playingWord === vocab.word
                            ? "text-sky-400 bg-sky-500/10 animate-pulse"
                            : ""
                        }`}
                      >
                        <Volume2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {vocab.part_of_speech && (
                        <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
                          {vocab.part_of_speech}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingCardId === fc.id}
                        aria-label={t("flashcards.removeCard")}
                        title={t("flashcards.removeCard")}
                        onClick={() => onDeleteCard(fc.id)}
                        className="size-7 p-0 rounded-full text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-sky-400 font-semibold">
                    {vocab.translation}
                  </p>

                  {vocab.example_sentence && (
                    <p className="text-xs text-neutral-400 italic line-clamp-2 pt-1 border-t border-neutral-800/60">
                      &ldquo;{vocab.example_sentence}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center gap-2">
                    {tier === "mastered" && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {t("flashcards.masteryMastered")}
                      </span>
                    )}
                    {tier === "reviewing" && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        {t("flashcards.masteryReviewing")}
                      </span>
                    )}
                    {tier === "learning" && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {t("flashcards.masteryLearning")}
                      </span>
                    )}
                  </div>

                  {vocab.story_id ? (
                    <Link
                      to="/stories/$storyId"
                      params={{ storyId: vocab.story_id.toString() }}
                      className="text-xs text-neutral-400 hover:text-sky-400 flex items-center gap-1 transition-colors"
                      title={t("flashcards.sourceStory")}
                    >
                      <BookOpen className="size-3.5" />
                      <span>{t("flashcards.sourceStory")}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-1 text-neutral-400">
                      <Clock className="size-3.5" />
                      <span>
                        {t("flashcards.intervalDays", {
                          days: fc.interval_days,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800 text-neutral-400 space-y-3">
          <p className="text-sm">
            {searchParam
              ? t("flashcards.noCardsSearch")
              : t("flashcards.caughtUpEmptyDeck")}
          </p>
        </div>
      )}
    </div>
  );
}

function FlashcardsComponent() {
  const { t } = useTranslation();
  const { getLanguageFlag, originLanguage, targetLanguage } = useLanguagePair();
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const activeTab = searchParams.tab ?? "review";
  const searchParam = searchParams.search ?? "";
  const scope = searchParams.scope ?? "pair";
  const masteryFilter: MasteryFilter = searchParams.mastery ?? "all";

  const [searchInput, setSearchInput] = useState(searchParam);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParam) {
        navigate({
          replace: true,
          search: (prev) => ({
            ...prev,
            search: searchInput.trim() || undefined,
          }),
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchParam, navigate]);

  const scopeFilters =
    scope === "pair"
      ? {
          origin_language_code: originLanguage.code,
          target_language_code: targetLanguage.code,
        }
      : undefined;

  const { data: dueCards, isLoading: isLoadingDue } =
    useDueFlashcards(scopeFilters);
  const { data: unsearchedCards } = useAllFlashcards(scopeFilters);
  const { data: allCards, isLoading: isLoadingAll } = useAllFlashcards({
    ...scopeFilters,
    search: searchParam.trim() || undefined,
  });
  const deleteFlashcard = useDeleteFlashcard();

  const totalDeckCount = (unsearchedCards ?? allCards)?.length || 0;

  const handleTabChange = (val: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        tab: val === "deck" ? "deck" : undefined,
      }),
    });
  };

  const handleScopeChange = (nextScope: "pair" | "all") => {
    navigate({
      search: (prev) => ({
        ...prev,
        scope: nextScope,
      }),
    });
  };

  const handleMasteryFilterChange = (nextMastery: MasteryFilter) => {
    navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        mastery: nextMastery === "all" ? undefined : nextMastery,
      }),
    });
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="size-6 text-sky-400" />
            {t("flashcards.title")}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {t("flashcards.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => handleScopeChange("pair")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                scope === "pair"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span>{getLanguageFlag(targetLanguage.code)}</span>
              <span>
                {t("flashcards.scopePair", { target: targetLanguage.name })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                scope === "all"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Globe className="size-3.5" />
              <span>{t("flashcards.scopeAll")}</span>
            </button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
              <TabsTrigger
                value="review"
                className="text-xs font-semibold px-3.5 py-1.5 rounded-lg"
              >
                {t("flashcards.dueReviewTab", {
                  count: dueCards?.length || 0,
                })}
              </TabsTrigger>
              <TabsTrigger
                value="deck"
                className="text-xs font-semibold px-3.5 py-1.5 rounded-lg"
              >
                {t("flashcards.allCardsTab", { count: totalDeckCount })}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeTab === "review" && (
        <FlashcardsReviewTab
          key={`${scope}:${originLanguage.code}:${targetLanguage.code}`}
          dueCards={dueCards}
          allCards={unsearchedCards ?? allCards}
          isLoadingDue={isLoadingDue}
          onBrowseDeck={() => handleTabChange("deck")}
        />
      )}

      {activeTab === "deck" && (
        <FlashcardsDeckTab
          cards={allCards}
          deletingCardId={
            deleteFlashcard.isPending ? deleteFlashcard.variables : undefined
          }
          isLoading={isLoadingAll}
          onDeleteCard={(flashcardId) => deleteFlashcard.mutate(flashcardId)}
          searchParam={searchParam}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          masteryFilter={masteryFilter}
          onFilterChange={handleMasteryFilterChange}
        />
      )}
    </div>
  );
}
