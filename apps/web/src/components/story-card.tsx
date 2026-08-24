import { Card, CardContent } from "@linguamaxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Clock, Heart } from "lucide-react";

import { useToggleFavorite } from "../lib/queries";
import type { StoryListItem, CEFRLevel } from "../types/api";

const LEVEL_COLORS: Record<CEFRLevel, string> = {
  A1: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  A2: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  B1: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  B2: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  C1: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  C2: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export function StoryCard({ story }: { story: StoryListItem }) {
  const toggleFavorite = useToggleFavorite();

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate(story.id);
  };

  const levelColorClass = LEVEL_COLORS[story.cefr_level] || LEVEL_COLORS.A1;

  return (
    <Link
      to="/stories/$storyId"
      params={{ storyId: story.id.toString() }}
      className="block group"
    >
      <Card className="overflow-hidden border-neutral-800/80 bg-neutral-900/60 hover:bg-neutral-900 transition-all duration-300 hover:border-neutral-700 hover:shadow-lg hover:shadow-sky-500/5 flex flex-col h-full rounded-xl">
        <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
          {story.image_url ? (
            <img
              src={story.image_url}
              alt={story.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
              <BookOpen className="size-10 text-neutral-700" />
            </div>
          )}

          {/* Top overlays */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-md border ${levelColorClass} backdrop-blur-md bg-neutral-950/80`}
            >
              {story.cefr_level}
            </span>
            {story.category && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-md border border-neutral-700 bg-neutral-950/80 text-neutral-300 backdrop-blur-md">
                {story.category.name}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleFavorite}
            className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-all ${
              story.is_favorite
                ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30"
                : "bg-neutral-950/70 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900/90"
            }`}
            aria-label="Toggle Favorite"
          >
            <Heart
              className={`size-4 ${story.is_favorite ? "fill-rose-500" : ""}`}
            />
          </button>

          {story.is_completed && (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 text-xs font-medium backdrop-blur-md">
              <CheckCircle2 className="size-3.5" />
              <span>Read</span>
              {story.quiz_score !== null && story.quiz_score !== undefined && (
                <span className="font-semibold text-white ml-0.5">
                  {story.quiz_score}%
                </span>
              )}
            </div>
          )}
        </div>

        <CardContent className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div>
            <h3 className="font-semibold text-neutral-100 text-base group-hover:text-sky-400 transition-colors line-clamp-1">
              {story.title}
            </h3>
            {story.title_translated && (
              <p className="text-xs text-neutral-400 font-normal line-clamp-1 mt-0.5">
                {story.title_translated}
              </p>
            )}
            {story.summary && (
              <p className="text-xs text-neutral-400 line-clamp-2 mt-2 leading-relaxed">
                {story.summary}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center gap-1">
              <Clock className="size-3.5" />
              <span>{story.estimated_reading_minutes} min read</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="size-3.5" />
              <span>{story.word_count} words</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
