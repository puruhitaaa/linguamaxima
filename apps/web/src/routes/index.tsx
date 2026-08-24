import { Button } from "@linguamaxima/ui/components/button";
import { Input } from "@linguamaxima/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Flame, Layers, Search, Sparkles } from "lucide-react";
import { useState } from "react";

import { GenerateStoryDialog } from "../components/generate-story-dialog";
import { StoryCard } from "../components/story-card";
import { useCategories, useProgress, useStories } from "../lib/queries";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const CEFR_TABS = ["all", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

function HomeComponent() {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: categories } = useCategories();
  const { data: progress } = useProgress();
  const { data: stories, isLoading } = useStories({
    cefr_level: selectedLevel !== "all" ? selectedLevel : undefined,
    category_slug: selectedCategory !== "all" ? selectedCategory : undefined,
    search: searchTerm.trim() || undefined,
  });

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
          <h3 className="text-lg font-bold text-white">No Stories Found</h3>
          <p className="text-xs text-neutral-400">
            {searchTerm || selectedLevel !== "all" || selectedCategory !== "all"
              ? "Try clearing or broadening your search filters."
              : "Generate your first German story using AI!"}
          </p>
        </div>
        <GenerateStoryDialog
          trigger={
            <Button className="bg-sky-500 hover:bg-sky-600 text-white gap-2 font-semibold">
              <Sparkles className="size-4" />
              Generate New Story
            </Button>
          }
        />
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Hero & Progress Summary Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-950/40 via-neutral-900 to-neutral-950 border border-neutral-800/80 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>Readle-Style AI German Reader for Indonesian Speakers</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Belajar Bahasa Jerman Lewat Cerita Interaktif
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Tingkatkan kosakata, tata bahasa, dan pemahaman Anda dengan cerita
              berjenjang CEFR, audio penutur asli neural, dan flashcard berulang
              berspasi (SRS).
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
                  Stories Read
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
                  Words Saved
                </span>
              </div>
              <div className="text-center px-2">
                <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                  <Flame className="size-4 fill-orange-400" />
                </div>
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {progress.current_streak_days}d
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">
                  Daily Streak
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Controls & Search */}
      <div className="space-y-4">
        {/* CEFR Level Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {CEFR_TABS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                  selectedLevel === lvl
                    ? "bg-sky-500 border-sky-400 text-white shadow-md shadow-sky-500/20"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                }`}
              >
                {lvl === "all" ? "All Levels" : `Level ${lvl}`}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-neutral-900 border-neutral-800 text-neutral-200 placeholder:text-neutral-500 rounded-xl"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 rounded-full font-medium transition-colors shrink-0 ${
              selectedCategory === "all"
                ? "bg-neutral-100 text-neutral-900 font-semibold"
                : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800"
            }`}
          >
            All Categories
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1 rounded-full font-medium transition-colors shrink-0 ${
                selectedCategory === cat.slug
                  ? "bg-neutral-100 text-neutral-900 font-semibold"
                  : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stories Grid */}
      {renderStoriesContent()}
    </div>
  );
}
