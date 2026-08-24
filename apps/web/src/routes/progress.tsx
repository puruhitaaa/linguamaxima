import { Card } from "@linguamaxima/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@linguamaxima/ui/components/tabs";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  Heart,
  Layers,
  Trophy,
} from "lucide-react";
import { z } from "zod";

import { StoryCard } from "../components/story-card";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import { useProgress, useStories } from "../lib/queries";
import type { StoryListItem } from "../types/api";

const CEFR_TABS = ["all", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

const progressSearchSchema = z.object({
  level: z.enum(CEFR_TABS).optional().default("all"),
  tab: z
    .enum(["overview", "favorites", "completed"])
    .optional()
    .default("overview"),
});

export const Route = createFileRoute("/progress")({
  component: ProgressComponent,
  validateSearch: (search: Record<string, unknown>) =>
    progressSearchSchema.parse(search),
});

function StoryGridSection({
  emptyMessage,
  isLoading,
  stories,
}: {
  emptyMessage: string;
  isLoading: boolean;
  stories: StoryListItem[];
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-72 rounded-xl bg-neutral-900/60 border border-neutral-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (stories.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 rounded-2xl bg-neutral-900/30 border border-neutral-800 text-center text-neutral-400 text-xs">
      {emptyMessage}
    </div>
  );
}

function MetricsGrid({
  progress,
}: {
  progress?: {
    average_quiz_score: number;
    current_streak_days: number;
    total_stories_available: number;
    total_stories_read: number;
    total_words_learned: number;
  };
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-neutral-900/60 border-neutral-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
            <BookOpen className="size-5" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium block">
              {t("progress.storiesRead")}
            </span>
            <span className="text-2xl font-black text-white">
              {progress?.total_stories_read || 0}
              <span className="text-xs text-neutral-500 font-normal ml-1">
                / {progress?.total_stories_available || 0}
              </span>
            </span>
          </div>
        </div>
      </Card>

      <Card className="bg-neutral-900/60 border-neutral-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Layers className="size-5" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium block">
              {t("progress.wordsSaved")}
            </span>
            <span className="text-2xl font-black text-white">
              {progress?.total_words_learned || 0}
            </span>
          </div>
        </div>
      </Card>

      <Card className="bg-neutral-900/60 border-neutral-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <Flame className="size-5 fill-orange-400" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium block">
              {t("progress.dailyStreak")}
            </span>
            <span className="text-2xl font-black text-white">
              {progress?.current_streak_days || 0}{" "}
              {t("progress.streakDaysSuffix")}
            </span>
          </div>
        </div>
      </Card>

      <Card className="bg-neutral-900/60 border-neutral-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Trophy className="size-5" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium block">
              {t("progress.averageQuiz")}
            </span>
            <span className="text-2xl font-black text-white">
              {progress?.average_quiz_score
                ? `${progress.average_quiz_score}%`
                : "—"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function OverviewTabContent({
  compList,
  favList,
  isLoadingCompleted,
  isLoadingFavorites,
  onViewAllCompleted,
  onViewAllFavorites,
}: {
  compList: StoryListItem[];
  favList: StoryListItem[];
  isLoadingCompleted: boolean;
  isLoadingFavorites: boolean;
  onViewAllCompleted: () => void;
  onViewAllFavorites: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="size-5 text-rose-500 fill-rose-500" />
            <h2 className="text-lg font-bold text-white">
              {t("progress.favoriteStories", { count: favList.length })}
            </h2>
          </div>
          {favList.length > 3 && (
            <button
              type="button"
              onClick={onViewAllFavorites}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              {t("progress.viewAllFavorites")}
            </button>
          )}
        </div>

        <StoryGridSection
          stories={favList}
          isLoading={isLoadingFavorites}
          emptyMessage={t("progress.emptyFavoritesOverview")}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              {t("progress.completedStories", { count: compList.length })}
            </h2>
          </div>
          {compList.length > 3 && (
            <button
              type="button"
              onClick={onViewAllCompleted}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              {t("progress.viewAllCompleted")}
            </button>
          )}
        </div>

        <StoryGridSection
          stories={compList}
          isLoading={isLoadingCompleted}
          emptyMessage={t("progress.emptyCompletedOverview")}
        />
      </div>
    </div>
  );
}

function ProgressComponent() {
  const { t } = useTranslation();
  const { targetLanguage } = useLanguagePair();
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const activeTab = searchParams.tab ?? "overview";
  const selectedLevel = searchParams.level ?? "all";

  const { data: progress } = useProgress();

  const { data: favoriteStories, isLoading: isLoadingFavorites } = useStories({
    cefr_level: selectedLevel !== "all" ? selectedLevel : undefined,
    is_favorite: true,
  });

  const { data: completedStories, isLoading: isLoadingCompleted } = useStories({
    cefr_level: selectedLevel !== "all" ? selectedLevel : undefined,
    is_completed: true,
  });

  const handleTabChange = (tab: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        tab:
          tab === "overview" ? undefined : (tab as "favorites" | "completed"),
      }),
    });
  };

  const handleLevelChange = (lvl: (typeof CEFR_TABS)[number]) => {
    navigate({
      search: (prev) => ({
        ...prev,
        level: lvl === "all" ? undefined : lvl,
      }),
    });
  };

  const favList = favoriteStories || [];
  const compList = completedStories || [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="size-6 text-sky-400" />
            {t("progress.title")}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {t("progress.subtitle", { target: targetLanguage.name })}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-neutral-900 border border-neutral-800">
            <TabsTrigger
              value="overview"
              className="text-xs font-semibold px-3 py-1.5"
            >
              {t("progress.overviewTab")}
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="text-xs font-semibold px-3 py-1.5"
            >
              {t("progress.favoritesTab", { count: favList.length })}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="text-xs font-semibold px-3 py-1.5"
            >
              {t("progress.completedTab", { count: compList.length })}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Metric Cards Grid */}
      <MetricsGrid progress={progress} />

      {/* CEFR Level Filter Pills (active on all tabs) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        {CEFR_TABS.map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => handleLevelChange(lvl)}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition-all border ${
              selectedLevel === lvl
                ? "bg-sky-500 border-sky-400 text-white shadow-md shadow-sky-500/20"
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
            }`}
          >
            {lvl === "all"
              ? t("progress.allLevels")
              : t("progress.levelPrefix", { level: lvl })}
          </button>
        ))}
      </div>

      {/* Overview Tab: Displays both sections */}
      {activeTab === "overview" && (
        <OverviewTabContent
          favList={favList}
          compList={compList}
          isLoadingFavorites={isLoadingFavorites}
          isLoadingCompleted={isLoadingCompleted}
          onViewAllFavorites={() => handleTabChange("favorites")}
          onViewAllCompleted={() => handleTabChange("completed")}
        />
      )}

      {/* Favorites Tab */}
      {activeTab === "favorites" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="size-5 text-rose-500 fill-rose-500" />
            <h2 className="text-lg font-bold text-white">
              {t("progress.favoriteStories", { count: favList.length })}
            </h2>
          </div>

          <StoryGridSection
            stories={favList}
            isLoading={isLoadingFavorites}
            emptyMessage={t("progress.emptyFavoritesTab")}
          />
        </div>
      )}

      {/* Completed Tab */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              {t("progress.completedStories", { count: compList.length })}
            </h2>
          </div>

          <StoryGridSection
            stories={compList}
            isLoading={isLoadingCompleted}
            emptyMessage={t("progress.emptyCompletedTab")}
          />
        </div>
      )}
    </div>
  );
}
