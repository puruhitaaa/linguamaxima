import { Button } from "@linguamaxima/ui/components/button";
import { Input } from "@linguamaxima/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Flame, Globe, Layers, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { GenerateStoryDialog } from "../components/generate-story-dialog";
import { LanguagePairModal } from "../components/language-pair-modal";
import { StoryCard } from "../components/story-card";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import { useCategories, useProgress, useStories } from "../lib/queries";

const CEFR_TABS = ["all", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

const storiesSearchSchema = z.object({
  category: z.string().optional().default("all"),
  language_scope: z.enum(["pair", "all"]).optional().default("pair"),
  level: z.enum(CEFR_TABS).optional().default("all"),
  search: z.string().optional().default(""),
});

export const Route = createFileRoute("/")({
  component: HomeComponent,
  validateSearch: (search: Record<string, unknown>) =>
    storiesSearchSchema.parse(search),
});

function HomeComponent() {
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const selectedLevel = searchParams.level ?? "all";
  const selectedCategory = searchParams.category ?? "all";
  const searchParam = searchParams.search ?? "";
  const languageScope = searchParams.language_scope ?? "pair";

  const { t, tCategory } = useTranslation();
  const { getLanguageFlag, originLanguage, targetLanguage } = useLanguagePair();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
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

  const { data: categories } = useCategories();
  const { data: progress } = useProgress();
  const { data: stories, isLoading } = useStories({
    category_slug: selectedCategory !== "all" ? selectedCategory : undefined,
    cefr_level: selectedLevel !== "all" ? selectedLevel : undefined,
    origin_language_code:
      languageScope === "pair" ? originLanguage.code : undefined,
    search: searchParam.trim() || undefined,
    target_language_code:
      languageScope === "pair" ? targetLanguage.code : undefined,
  });

  const handleSelectLevel = (lvl: (typeof CEFR_TABS)[number]) => {
    navigate({
      search: (prev) => ({
        ...prev,
        level: lvl === "all" ? undefined : lvl,
      }),
    });
  };

  const handleSelectCategory = (catSlug: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        category: catSlug === "all" ? undefined : catSlug,
      }),
    });
  };

  const handleToggleScope = (scope: "pair" | "all") => {
    navigate({
      search: (prev) => ({
        ...prev,
        language_scope: scope === "pair" ? undefined : "all",
      }),
    });
  };

  const renderStoriesContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-xl bg-neutral-900/60 border border-neutral-800 animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (stories && stories.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      );
    }

    return (
      <div className="text-center py-16 px-4 rounded-2xl bg-neutral-900/30 border border-neutral-800/80 space-y-4 max-w-md mx-auto">
        <div className="size-12 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
          <Sparkles className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">
            {languageScope === "pair"
              ? t("home.emptyTitlePair", { target: targetLanguage.name })
              : t("home.emptyTitleGeneric")}
          </h3>
          <p className="text-xs text-neutral-400">
            {searchParam ||
            selectedLevel !== "all" ||
            selectedCategory !== "all"
              ? t("home.emptyDescGeneric")
              : t("home.emptyDescPair", { target: targetLanguage.name })}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          {languageScope === "pair" && (
            <Button
              variant="outline"
              onClick={() => handleToggleScope("all")}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs"
            >
              {t("home.emptyActionAll")}
            </Button>
          )}
          <GenerateStoryDialog
            trigger={
              <Button className="bg-sky-500 hover:bg-sky-600 text-white gap-2 font-semibold text-xs">
                <Sparkles className="size-4" />
                {t("home.emptyActionGenerate", { target: targetLanguage.name })}
              </Button>
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Hero & Progress Summary Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-950/40 via-neutral-900 to-neutral-950 border border-neutral-800/80 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            {/* Active Language Badge & Switcher */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>
                {t("home.learningBadge", {
                  origin: originLanguage.name,
                  originFlag: getLanguageFlag(originLanguage.code),
                  target: targetLanguage.name,
                  targetFlag: getLanguageFlag(targetLanguage.code),
                })}
              </span>
              <button
                type="button"
                onClick={() => setIsLangModalOpen(true)}
                className="ml-1 text-[11px] underline text-sky-300 hover:text-white"
              >
                {t("home.changeLanguage")}
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t("home.heroTitle", { target: targetLanguage.name })}
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              {t("home.heroSubtitle", { origin: originLanguage.name })}
            </p>
          </div>

          {/* Stat widgets */}
          {progress && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 bg-neutral-950/70 border border-neutral-800/90 p-4 rounded-2xl shrink-0">
              <div className="text-center px-2">
                <div className="flex items-center justify-center gap-1 text-sky-400 mb-1">
                  <BookOpen className="size-4" />
                </div>
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {progress.total_stories_read}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">
                  {t("home.storiesRead")}
                </span>
              </div>
              <div className="text-center px-2 border-x border-neutral-800">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                  <Layers className="size-4" />
                </div>
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {progress.total_words_learned}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">
                  {t("home.wordsSaved")}
                </span>
              </div>
              <div className="text-center px-2">
                <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                  <Flame className="size-4 fill-orange-400" />
                </div>
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {t("home.streakCount", {
                    days: progress.current_streak_days,
                  })}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">
                  {t("home.dailyStreak")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Controls & Search */}
      <div className="space-y-4">
        {/* Language Scope & CEFR Level Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Language Scope Switcher */}
            <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => handleToggleScope("pair")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  languageScope === "pair"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <span>{getLanguageFlag(targetLanguage.code)}</span>
                <span>
                  {t("home.targetStoriesTab", { target: targetLanguage.name })}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleScope("all")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  languageScope === "all"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Globe className="size-3.5" />
                <span>{t("home.allLanguages")}</span>
              </button>
            </div>

            {/* CEFR Level Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {CEFR_TABS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleSelectLevel(lvl)}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all border ${
                    selectedLevel === lvl
                      ? "bg-neutral-800 border-neutral-700 text-white shadow-sm"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                  }`}
                >
                  {lvl === "all" ? t("home.allLevels") : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
            <Input
              type="text"
              placeholder={
                languageScope === "pair"
                  ? t("home.searchPlaceholder", { target: targetLanguage.name })
                  : `${t("common.search")}...`
              }
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 text-xs bg-neutral-900 border-neutral-800 text-neutral-200 placeholder:text-neutral-500 rounded-xl"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => handleSelectCategory("all")}
            className={`px-3 py-1 rounded-full font-medium transition-colors shrink-0 ${
              selectedCategory === "all"
                ? "bg-neutral-100 text-neutral-900 font-semibold"
                : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800"
            }`}
          >
            {t("home.allCategories")}
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => handleSelectCategory(cat.slug)}
              className={`px-3 py-1 rounded-full font-medium transition-colors shrink-0 ${
                selectedCategory === cat.slug
                  ? "bg-neutral-100 text-neutral-900 font-semibold"
                  : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800"
              }`}
            >
              {tCategory(cat.slug)}
            </button>
          ))}
        </div>
      </div>

      {/* Stories Grid */}
      {renderStoriesContent()}

      <LanguagePairModal
        open={isLangModalOpen}
        onOpenChange={setIsLangModalOpen}
      />
    </div>
  );
}
