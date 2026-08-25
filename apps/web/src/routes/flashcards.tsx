import { Button } from "@linguamaxima/ui/components/button";
import { Input } from "@linguamaxima/ui/components/input";
import { Progress } from "@linguamaxima/ui/components/progress";
import { Tabs, TabsList, TabsTrigger } from "@linguamaxima/ui/components/tabs";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { FlashcardCard } from "../components/flashcard-card";
import { api } from "../lib/api";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import {
  useAllFlashcards,
  useDueFlashcards,
  useReviewFlashcard,
} from "../lib/queries";
import type { Flashcard } from "../types/api";

const flashcardsSearchSchema = z.object({
  search: z.string().optional().default(""),
  tab: z.enum(["review", "deck"]).optional().default("review"),
});

export const Route = createFileRoute("/flashcards")({
  component: FlashcardsComponent,
  validateSearch: (search: Record<string, unknown>) =>
    flashcardsSearchSchema.parse(search),
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
    // Lock snapshot into customQueue on first rate to isolate from React Query optimistic filtering
    if (!customQueue) {
      setCustomQueue([...activeQueue]);
    }
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
  isLoading: boolean;
  searchParam: string;
  searchInput: string;
  onSearchChange: (val: string) => void;
  masteryFilter: MasteryFilter;
  onFilterChange: (filter: MasteryFilter) => void;
}

function FlashcardsDeckTab({
  cards,
  isLoading,
  searchParam,
  searchInput,
  onSearchChange,
  masteryFilter,
  onFilterChange,
}: DeckTabProps) {
  const { t } = useTranslation();
  const { targetLanguage } = useLanguagePair();

  const playWordAudio = useCallback(
    async (url?: string, word?: string) => {
      const mediaUrl = api.getMediaUrl(url);
      if (mediaUrl) {
        const audio = new Audio(mediaUrl);
        try {
          await audio.play();
        } catch {
          // Audio autoplay error handling
        }
      } else if (
        word &&
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        if (targetLanguage?.code) {
          utterance.lang = targetLanguage.code;
        }
        window.speechSynthesis.speak(utterance);
      }
    },
    [targetLanguage]
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
            const genderBadge = getGenderBadge(fc.vocabulary.gender);

            return (
              <div
                key={fc.id}
                className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex flex-col justify-between gap-3.5 hover:border-neutral-700 transition-all shadow-sm group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white tracking-tight">
                        {fc.vocabulary.word}
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
                            fc.vocabulary.pronunciation_url,
                            fc.vocabulary.word
                          )
                        }
                        className="size-7 p-0 rounded-full text-neutral-400 hover:text-sky-400 hover:bg-neutral-800 cursor-pointer"
                      >
                        <Volume2 className="size-3.5" />
                      </Button>
                    </div>

                    {fc.vocabulary.part_of_speech && (
                      <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 shrink-0">
                        {fc.vocabulary.part_of_speech}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-sky-400 font-semibold">
                    {fc.vocabulary.translation}
                  </p>

                  {fc.vocabulary.example_sentence && (
                    <p className="text-xs text-neutral-400 italic line-clamp-2 pt-1 border-t border-neutral-800/60">
                      &ldquo;{fc.vocabulary.example_sentence}&rdquo;
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

                  {fc.vocabulary.story_id ? (
                    <Link
                      to="/stories/$storyId"
                      params={{ storyId: fc.vocabulary.story_id.toString() }}
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
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const activeTab = searchParams.tab ?? "review";
  const searchParam = searchParams.search ?? "";

  const [searchInput, setSearchInput] = useState(searchParam);
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>("all");

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

  const { data: dueCards, isLoading: isLoadingDue } = useDueFlashcards();
  const { data: allCards, isLoading: isLoadingAll } = useAllFlashcards({
    search: searchParam.trim() || undefined,
  });

  const handleTabChange = (val: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        tab: val === "deck" ? "deck" : undefined,
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
              {t("flashcards.allCardsTab", { count: allCards?.length || 0 })}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "review" && (
        <FlashcardsReviewTab
          dueCards={dueCards}
          allCards={allCards}
          isLoadingDue={isLoadingDue}
          onBrowseDeck={() => handleTabChange("deck")}
        />
      )}

      {activeTab === "deck" && (
        <FlashcardsDeckTab
          cards={allCards}
          isLoading={isLoadingAll}
          searchParam={searchParam}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          masteryFilter={masteryFilter}
          onFilterChange={setMasteryFilter}
        />
      )}
    </div>
  );
}
