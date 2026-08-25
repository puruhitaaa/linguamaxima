import { Card } from "@linguamaxima/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@linguamaxima/ui/components/empty";
import { Tabs, TabsList, TabsTrigger } from "@linguamaxima/ui/components/tabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  Heart,
  Layers,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { z } from "zod";

import { StoryCard } from "../components/story-card";
import { useTranslation } from "../lib/i18n";
import type { TranslationKey } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import { useProgress, useStories } from "../lib/queries";
import type { StoryListItem } from "../types/api";

const CEFR_TABS = ["all", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

const CEFR_DESCRIPTOR_KEYS: Record<string, TranslationKey> = {
  A1: "progress.cefrA1",
  A2: "progress.cefrA2",
  B1: "progress.cefrB1",
  B2: "progress.cefrB2",
  C1: "progress.cefrC1",
  C2: "progress.cefrC2",
};

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
  action,
  emptyDescription,
  emptyIcon,
  emptyTitle,
  isLoading,
  stories,
}: {
  action?: {
    label: string;
    onAction?: () => void;
    search?: {
      category: string;
      language_scope: "pair" | "all";
      level: (typeof CEFR_TABS)[number];
      search: string;
    };
    to?: "/";
  };
  emptyDescription: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  isLoading: boolean;
  stories: StoryListItem[];
}) {
  const handleAction = () => {
    action?.onAction?.();
  };

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
    <Empty className="rounded-2xl border border-dashed border-neutral-800/90 bg-neutral-900/20 py-10 px-4">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-12 rounded-xl bg-neutral-800/60 text-neutral-400 border border-neutral-700/50"
        >
          {emptyIcon}
        </EmptyMedia>
        <EmptyTitle className="text-sm font-bold text-neutral-200">
          {emptyTitle}
        </EmptyTitle>
        <EmptyDescription className="text-xs text-neutral-400 max-w-sm mt-1">
          {emptyDescription}
        </EmptyDescription>
      </EmptyHeader>
      {action && (
        <EmptyContent className="mt-2">
          {action.to ? (
            <Link
              to={action.to}
              search={
                action.search ?? {
                  category: "all",
                  language_scope: "pair",
                  level: "all",
                  search: "",
                }
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
            >
              <span>{action.label}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 hover:text-white border border-neutral-700 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>{action.label}</span>
            </button>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
}

function MetricsGrid({
  isError,
  isLoading,
  onRetry,
  progress,
}: {
  isError: boolean;
  isLoading: boolean;
  onRetry?: () => void;
  progress?: {
    average_quiz_score: number;
    current_streak_days: number;
    total_stories_available: number;
    total_stories_read: number;
    total_words_learned: number;
  };
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] rounded-xl bg-neutral-900/60 border border-neutral-800 p-4 sm:p-5 flex items-center gap-3 animate-pulse"
          >
            <div className="size-10 rounded-xl bg-neutral-800/80 shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-3 w-16 bg-neutral-800/80 rounded" />
              <div className="h-6 w-12 bg-neutral-800/80 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <AlertCircle className="size-4 text-rose-400 shrink-0" />
          <span>{t("common.error")}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-semibold px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg transition-colors"
          >
            {t("common.retry")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-neutral-900/60 border-neutral-800 p-4 sm:p-5 rounded-xl hover:border-neutral-700/80 transition-colors">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <BookOpen className="size-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-neutral-400 font-medium block truncate">
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

      <Card className="bg-neutral-900/60 border-neutral-800 p-4 sm:p-5 rounded-xl hover:border-neutral-700/80 transition-colors">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="size-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-neutral-400 font-medium block truncate">
              {t("progress.wordsSaved")}
            </span>
            <span className="text-2xl font-black text-white">
              {progress?.total_words_learned || 0}
            </span>
          </div>
        </div>
      </Card>

      <Card className="bg-neutral-900/60 border-neutral-800 p-4 sm:p-5 rounded-xl hover:border-neutral-700/80 transition-colors">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <Flame className="size-5 fill-orange-400" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-neutral-400 font-medium block truncate">
              {t("progress.dailyStreak")}
            </span>
            <span className="text-2xl font-black text-white">
              {progress?.current_streak_days || 0}{" "}
              <span className="text-xs font-normal text-neutral-400 ml-0.5">
                {t("progress.streakDaysSuffix")}
              </span>
            </span>
          </div>
        </div>
      </Card>

      <Card className="bg-neutral-900/60 border-neutral-800 p-4 sm:p-5 rounded-xl hover:border-neutral-700/80 transition-colors">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Trophy className="size-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-neutral-400 font-medium block truncate">
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
  onClearFilter,
  onViewAllCompleted,
  onViewAllFavorites,
  selectedLevel,
}: {
  compList: StoryListItem[];
  favList: StoryListItem[];
  isLoadingCompleted: boolean;
  isLoadingFavorites: boolean;
  onClearFilter: () => void;
  onViewAllCompleted: () => void;
  onViewAllFavorites: () => void;
  selectedLevel: (typeof CEFR_TABS)[number];
}) {
  const { t } = useTranslation();

  // Curated preview (top 3) for Overview
  const favPreview = favList.slice(0, 3);
  const compPreview = compList.slice(0, 3);

  const isFiltered = selectedLevel !== "all";

  return (
    <div className="space-y-10">
      {/* Favorites Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="size-5 text-rose-500 fill-rose-500" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t("progress.favoriteStories", { count: favList.length })}
            </h2>
          </div>
          {favList.length > 3 && (
            <button
              type="button"
              onClick={onViewAllFavorites}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{t("progress.viewAllFavorites")}</span>
            </button>
          )}
        </div>

        <StoryGridSection
          stories={favPreview}
          isLoading={isLoadingFavorites}
          emptyIcon={<Heart className="size-6 text-rose-500/80" />}
          emptyTitle={
            isFiltered
              ? t("progress.noFavoritesFiltered")
              : t("progress.emptyFavoritesOverview")
          }
          emptyDescription={
            isFiltered
              ? t("progress.emptyFavoritesTab")
              : t("progress.allFavoritesEmpty")
          }
          action={
            isFiltered
              ? { label: t("progress.allLevels"), onAction: onClearFilter }
              : { label: t("home.heroTitle"), to: "/" }
          }
        />
      </div>

      {/* Completed Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t("progress.completedStories", { count: compList.length })}
            </h2>
          </div>
          {compList.length > 3 && (
            <button
              type="button"
              onClick={onViewAllCompleted}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{t("progress.viewAllCompleted")}</span>
            </button>
          )}
        </div>

        <StoryGridSection
          stories={compPreview}
          isLoading={isLoadingCompleted}
          emptyIcon={<CheckCircle2 className="size-6 text-emerald-400/80" />}
          emptyTitle={
            isFiltered
              ? t("progress.noCompletedFiltered")
              : t("progress.emptyCompletedOverview")
          }
          emptyDescription={
            isFiltered
              ? t("progress.emptyCompletedTab")
              : t("progress.allCompletedEmpty")
          }
          action={
            isFiltered
              ? { label: t("progress.allLevels"), onAction: onClearFilter }
              : { label: t("home.heroTitle"), to: "/" }
          }
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

  const {
    data: progress,
    isError: isProgressError,
    isLoading: isLoadingProgress,
    refetch: refetchProgress,
  } = useProgress();

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
        tab: tab as "overview" | "favorites" | "completed",
      }),
    });
  };

  const handleLevelChange = (lvl: (typeof CEFR_TABS)[number]) => {
    navigate({
      search: (prev) => ({
        ...prev,
        level: lvl,
      }),
    });
  };

  const favList = favoriteStories || [];
  const compList = completedStories || [];
  const isFiltered = selectedLevel !== "all";

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Title & Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <GraduationCap className="size-5" />
            </div>
            <span>{t("progress.title")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {t("progress.subtitle", { target: targetLanguage.name })}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-neutral-900/90 border border-neutral-800/80 p-1">
            <TabsTrigger
              value="overview"
              className="text-xs font-semibold px-3 py-1.5"
            >
              {t("progress.overviewTab")}
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5"
            >
              <span>{t("common.favorites")}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                {favList.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5"
            >
              <span>{t("common.completed")}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {compList.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Global Learning Metrics Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400 px-0.5">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
            <Sparkles className="size-3.5 text-sky-400" />
            <span>{t("progress.dashboardTitle")}</span>
          </div>
          <span className="text-neutral-500">{targetLanguage.name}</span>
        </div>

        <MetricsGrid
          progress={progress}
          isLoading={isLoadingProgress}
          isError={isProgressError}
          onRetry={() => refetchProgress()}
        />
      </div>

      {/* CEFR Level Filter Bar with Descriptors */}
      <div className="space-y-2 pt-2 border-t border-neutral-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 max-w-full scrollbar-none">
          {CEFR_TABS.map((lvl) => {
            const isSelected = selectedLevel === lvl;
            const descriptorKey = CEFR_DESCRIPTOR_KEYS[lvl];
            const descriptor = descriptorKey ? t(descriptorKey) : undefined;

            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLevelChange(lvl)}
                className={`px-3 py-1.5 text-xs rounded-xl transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-sky-500 border-sky-400 text-white font-bold shadow-md shadow-sky-500/20"
                    : "bg-neutral-900/80 border-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 font-medium"
                }`}
              >
                <span>
                  {lvl === "all"
                    ? t("progress.allLevels")
                    : t("progress.levelPrefix", { level: lvl })}
                </span>
                {descriptor && (
                  <span
                    className={`text-xs opacity-75 font-normal ${
                      isSelected ? "text-sky-100" : "text-neutral-500"
                    }`}
                  >
                    ({descriptor})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab: Displays Curated Previews */}
      {activeTab === "overview" && (
        <OverviewTabContent
          favList={favList}
          compList={compList}
          isLoadingFavorites={isLoadingFavorites}
          isLoadingCompleted={isLoadingCompleted}
          selectedLevel={selectedLevel}
          onClearFilter={() => handleLevelChange("all")}
          onViewAllFavorites={() => handleTabChange("favorites")}
          onViewAllCompleted={() => handleTabChange("completed")}
        />
      )}

      {/* Dedicated Favorites Tab */}
      {activeTab === "favorites" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="size-5 text-rose-500 fill-rose-500" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t("progress.favoriteStories", { count: favList.length })}
              </h2>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={() => handleLevelChange("all")}
                className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>{t("progress.allLevels")}</span>
              </button>
            )}
          </div>

          <StoryGridSection
            stories={favList}
            isLoading={isLoadingFavorites}
            emptyIcon={<Heart className="size-6 text-rose-500/80" />}
            emptyTitle={
              isFiltered
                ? t("progress.noFavoritesFiltered")
                : t("progress.emptyFavoritesTab")
            }
            emptyDescription={
              isFiltered
                ? t("progress.emptyFavoritesTab")
                : t("progress.allFavoritesEmpty")
            }
            action={
              isFiltered
                ? {
                    label: t("progress.allLevels"),
                    onAction: () => handleLevelChange("all"),
                  }
                : { label: t("home.heroTitle"), to: "/" }
            }
          />
        </div>
      )}

      {/* Dedicated Completed Tab */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t("progress.completedStories", { count: compList.length })}
              </h2>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={() => handleLevelChange("all")}
                className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>{t("progress.allLevels")}</span>
              </button>
            )}
          </div>

          <StoryGridSection
            stories={compList}
            isLoading={isLoadingCompleted}
            emptyIcon={<CheckCircle2 className="size-6 text-emerald-400/80" />}
            emptyTitle={
              isFiltered
                ? t("progress.noCompletedFiltered")
                : t("progress.emptyCompletedTab")
            }
            emptyDescription={
              isFiltered
                ? t("progress.emptyCompletedTab")
                : t("progress.allCompletedEmpty")
            }
            action={
              isFiltered
                ? {
                    label: t("progress.allLevels"),
                    onAction: () => handleLevelChange("all"),
                  }
                : { label: t("home.heroTitle"), to: "/" }
            }
          />
        </div>
      )}
    </div>
  );
}
