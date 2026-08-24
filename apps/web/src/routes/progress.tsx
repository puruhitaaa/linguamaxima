import { Card } from "@linguamaxima/ui/components/card";
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

import { StoryCard } from "../components/story-card";
import { useProgress, useStories } from "../lib/queries";

export const Route = createFileRoute("/progress")({
  component: ProgressComponent,
});

function ProgressComponent() {
  const { data: progress } = useProgress();
  const { data: stories } = useStories();

  const favoriteStories = stories?.filter((s) => s.is_favorite) || [];
  const completedStories = stories?.filter((s) => s.is_completed) || [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <GraduationCap className="size-6 text-sky-400" />
          Learning Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Track your German reading milestones, vocabulary retention, and quiz
          achievements.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-neutral-900/60 border-neutral-800 p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <BookOpen className="size-5" />
            </div>
            <div>
              <span className="text-xs text-neutral-400 font-medium block">
                Stories Read
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
                Words Saved
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
                Daily Streak
              </span>
              <span className="text-2xl font-black text-white">
                {progress?.current_streak_days || 0} days
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
                Average Quiz
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

      {/* Favorite Stories Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="size-5 text-rose-500 fill-rose-500" />
          <h2 className="text-lg font-bold text-white">
            Favorite Stories ({favoriteStories.length})
          </h2>
        </div>

        {favoriteStories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-neutral-900/30 border border-neutral-800 text-center text-neutral-400 text-xs">
            No favorite stories yet. Click the heart icon on any story to save
            it here!
          </div>
        )}
      </div>

      {/* Completed Stories Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">
            Completed Stories ({completedStories.length})
          </h2>
        </div>

        {completedStories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-neutral-900/30 border border-neutral-800 text-center text-neutral-400 text-xs">
            No completed stories yet. Read a story and complete its quiz to mark
            it finished!
          </div>
        )}
      </div>
    </div>
  );
}
