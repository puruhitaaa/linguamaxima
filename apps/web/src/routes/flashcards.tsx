import { Button } from "@linguamaxima/ui/components/button";
import { Input } from "@linguamaxima/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@linguamaxima/ui/components/tabs";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { FlashcardCard } from "../components/flashcard-card";
import { useTranslation } from "../lib/i18n";
import {
  useAllFlashcards,
  useDueFlashcards,
  useReviewFlashcard,
} from "../lib/queries";

const flashcardsSearchSchema = z.object({
  search: z.string().optional().default(""),
  tab: z.enum(["review", "deck"]).optional().default("review"),
});

export const Route = createFileRoute("/flashcards")({
  component: FlashcardsComponent,
  validateSearch: (search: Record<string, unknown>) =>
    flashcardsSearchSchema.parse(search),
});

function FlashcardsComponent() {
  const { t } = useTranslation();
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const activeTab = searchParams.tab ?? "review";
  const searchParam = searchParams.search ?? "";

  const [searchInput, setSearchInput] = useState(searchParam);

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
  const reviewMutation = useReviewFlashcard();

  const [currentIdx, setCurrentIdx] = useState(0);

  const dueList = dueCards || [];
  const currentCard = dueList[currentIdx];
  const isSessionComplete = dueList.length > 0 && currentIdx >= dueList.length;

  const handleTabChange = (val: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        tab: val === "deck" ? "deck" : undefined,
      }),
    });
  };

  const handleRate = (quality: number) => {
    if (!currentCard) {
      return;
    }
    reviewMutation.mutate({
      flashcardId: currentCard.id,
      quality,
    });
    setCurrentIdx((prev) => prev + 1);
  };

  const renderReviewContent = () => {
    if (isLoadingDue) {
      return (
        <div className="h-80 rounded-2xl bg-neutral-900/60 border border-neutral-800 animate-pulse" />
      );
    }

    if (isSessionComplete || dueList.length === 0) {
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
              {dueList.length === 0 && !allCards?.length
                ? t("flashcards.caughtUpEmptyDeck")
                : t("flashcards.caughtUpReviewDone")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/">
              <Button className="bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2">
                <BookOpen className="size-4" />
                {t("flashcards.readMoreStories")}
              </Button>
            </Link>
            {allCards && allCards.length > 0 && (
              <Button
                variant="outline"
                onClick={() => handleTabChange("deck")}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                {t("flashcards.browseDeck")}
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between text-xs text-neutral-400 max-w-xl mx-auto px-1">
          <span className="font-semibold uppercase tracking-wider text-sky-400">
            {t("flashcards.dailyReview")}
          </span>
          <span className="font-mono">
            {t("flashcards.cardOf", {
              current: currentIdx + 1,
              total: dueList.length,
            })}
          </span>
        </div>

        <FlashcardCard
          key={currentCard.id}
          card={currentCard}
          onRate={handleRate}
          isSubmitting={reviewMutation.isPending}
        />
      </div>
    );
  };

  const renderDeckContent = () => {
    if (isLoadingAll) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (allCards && allCards.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allCards.map((fc) => (
            <div
              key={fc.id}
              className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between gap-3 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">
                      {fc.vocabulary.word}
                    </h4>
                    {fc.vocabulary.gender && (
                      <span className="px-1.5 py-0.2 text-[11px] font-bold rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {fc.vocabulary.gender}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-sky-400 font-semibold mt-0.5">
                    {fc.vocabulary.translation}
                  </p>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500">
                  {fc.vocabulary.part_of_speech}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
                <div className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  <span>
                    {t("flashcards.intervalDays", { days: fc.interval_days })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="size-3.5 text-amber-400" />
                  <span>
                    {t("flashcards.repsCount", { reps: fc.repetitions })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="p-8 text-center bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-400">
        <p>
          {searchParam
            ? t("flashcards.noCardsSearch")
            : t("flashcards.caughtUpEmptyDeck")}
        </p>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Layers className="size-6 text-sky-400" />
            {t("flashcards.title")}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {t("flashcards.subtitle")}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-neutral-900 border border-neutral-800">
            <TabsTrigger
              value="review"
              className="text-xs font-semibold px-3 py-1.5"
            >
              {t("flashcards.dueReviewTab", { count: dueList.length })}
            </TabsTrigger>
            <TabsTrigger
              value="deck"
              className="text-xs font-semibold px-3 py-1.5"
            >
              {t("flashcards.allCardsTab", { count: allCards?.length || 0 })}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* TAB 1: REVIEW SESSION */}
      {activeTab === "review" && (
        <div className="space-y-6">{renderReviewContent()}</div>
      )}

      {/* TAB 2: FULL VOCABULARY DECK */}
      {activeTab === "deck" && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
            <Input
              type="text"
              placeholder={t("flashcards.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 text-xs bg-neutral-900 border-neutral-800 text-neutral-200 placeholder:text-neutral-500 rounded-xl"
            />
          </div>
          {renderDeckContent()}
        </div>
      )}
    </div>
  );
}
