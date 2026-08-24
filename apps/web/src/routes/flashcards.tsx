import { Button } from "@linguamaxima/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@linguamaxima/ui/components/tabs";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Clock, Layers, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FlashcardCard } from "../components/flashcard-card";
import {
  useAllFlashcards,
  useDueFlashcards,
  useReviewFlashcard,
} from "../lib/queries";

export const Route = createFileRoute("/flashcards")({
  component: FlashcardsComponent,
});

function FlashcardsComponent() {
  const { data: dueCards, isLoading: isLoadingDue } = useDueFlashcards();
  const { data: allCards, isLoading: isLoadingAll } = useAllFlashcards();
  const reviewMutation = useReviewFlashcard();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("review");

  const dueList = dueCards || [];
  const currentCard = dueList[currentIdx];
  const isSessionComplete = dueList.length > 0 && currentIdx >= dueList.length;

  const handleRate = async (quality: number) => {
    if (!currentCard) {
      return;
    }
    try {
      await reviewMutation.mutateAsync({
        flashcardId: currentCard.id,
        quality,
      });
      setCurrentIdx((prev) => prev + 1);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to submit review";
      toast.error(message);
    }
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
            <h3 className="text-2xl font-bold text-white">All Caught Up!</h3>
            <p className="text-sm text-neutral-400">
              {dueList.length === 0 && !allCards?.length
                ? "You have not saved any vocabulary words yet. Read stories and tap words to add them to your deck!"
                : "You have reviewed all due flashcards for today. Great job!"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/">
              <Button className="bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2">
                <BookOpen className="size-4" />
                Read More Stories
              </Button>
            </Link>
            {allCards && allCards.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setActiveTab("deck")}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                Browse Deck
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
            Daily Review
          </span>
          <span className="font-mono">
            Card {currentIdx + 1} of {dueList.length}
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
                  <span>Interval: {fc.interval_days}d</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="size-3.5 text-amber-400" />
                  <span>Reps: {fc.repetitions}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="p-8 text-center bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-400">
        <p>Your deck is empty. Save words from stories to start learning!</p>
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
            Spaced Repetition Flashcards
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Review vocabulary using the SuperMemo SM-2 spaced repetition
            algorithm.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-neutral-900 border border-neutral-800">
            <TabsTrigger
              value="review"
              className="text-xs font-semibold px-3 py-1.5"
            >
              Due Review ({dueList.length})
            </TabsTrigger>
            <TabsTrigger
              value="deck"
              className="text-xs font-semibold px-3 py-1.5"
            >
              All Cards ({allCards?.length || 0})
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
        <div className="space-y-4">{renderDeckContent()}</div>
      )}
    </div>
  );
}
