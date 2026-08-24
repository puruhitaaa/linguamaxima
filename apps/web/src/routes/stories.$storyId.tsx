import { Button } from "@linguamaxima/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@linguamaxima/ui/components/tabs";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  GraduationCap,
  Heart,
  HelpCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AudioPlayer } from "../components/audio-player";
import { InteractiveStoryText } from "../components/interactive-story-text";
import { QuizSection } from "../components/quiz-section";
import { useSaveFlashcard, useStory, useToggleFavorite } from "../lib/queries";
import type { CEFRLevel } from "../types/api";

const storyDetailSearchSchema = z.object({
  tab: z
    .enum(["story", "vocabulary", "grammar", "quiz"])
    .optional()
    .default("story"),
});

export const Route = createFileRoute("/stories/$storyId")({
  component: StoryReadingComponent,
  validateSearch: (search: Record<string, unknown>) =>
    storyDetailSearchSchema.parse(search),
});

const LEVEL_COLORS: Record<CEFRLevel, string> = {
  A1: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  A2: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  B1: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  B2: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  C1: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  C2: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const GENDER_BADGE_STYLE: Record<string, string> = {
  das: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  der: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  die: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

function StoryReadingComponent() {
  const { storyId } = Route.useParams();
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const activeTab = searchParams.tab ?? "story";

  const { data: story, isLoading, error } = useStory(storyId);
  const toggleFavorite = useToggleFavorite();
  const saveFlashcard = useSaveFlashcard();

  const [showParallelTranslation, setShowParallelTranslation] = useState(false);

  const handleTabChange = (tab: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        tab:
          tab === "story"
            ? undefined
            : (tab as "vocabulary" | "grammar" | "quiz"),
      }),
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 space-y-6">
        <div className="h-6 w-32 bg-neutral-800 rounded animate-pulse" />
        <div className="h-48 bg-neutral-900 rounded-2xl animate-pulse" />
        <div className="h-96 bg-neutral-900 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Story Not Found</h2>
        <p className="text-sm text-neutral-400">
          The requested story could not be loaded.
        </p>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Stories
          </Button>
        </Link>
      </div>
    );
  }

  const handleSaveVocab = (vocabId: number) => {
    saveFlashcard.mutate(vocabId);
  };

  const levelColorClass = LEVEL_COLORS[story.cefr_level] || LEVEL_COLORS.A1;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6">
      {/* Top Bar with Back Link and Actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Stories</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggleFavorite.mutate(story.id)}
            className={`gap-1.5 border-neutral-800 text-xs font-semibold ${
              story.is_favorite
                ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                : "text-neutral-300"
            }`}
          >
            <Heart
              className={`size-3.5 ${story.is_favorite ? "fill-rose-400" : ""}`}
            />
            <span>{story.is_favorite ? "Favorited" : "Favorite"}</span>
          </Button>
        </div>
      </div>

      {/* Story Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${levelColorClass}`}
          >
            Level {story.cefr_level}
          </span>
          {story.language_pair && (
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-400">
              {story.language_pair.target_language.name} ←{" "}
              {story.language_pair.origin_language.name}
            </span>
          )}
          {story.category && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md border border-neutral-700 bg-neutral-800 text-neutral-300">
              {story.category.name}
            </span>
          )}
          <span className="text-xs text-neutral-400 font-medium ml-auto">
            {story.estimated_reading_minutes} min read • {story.word_count}{" "}
            words
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {story.title}
          </h1>
          {story.title_translated && (
            <p className="text-sm sm:text-base text-neutral-400 font-medium mt-1">
              {story.title_translated}
            </p>
          )}
        </div>

        {story.summary && (
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed border-t border-neutral-800/80 pt-3 italic">
            Summary: {story.summary}
          </p>
        )}

        {/* Audio Player */}
        {story.audio_url && (
          <div className="pt-2">
            <AudioPlayer audioUrl={story.audio_url} storyTitle={story.title} />
          </div>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-neutral-800 pb-2">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
            <TabsTrigger
              value="story"
              className="gap-2 text-xs font-semibold px-4 py-2 rounded-lg"
            >
              <BookOpen className="size-4" />
              <span>Story</span>
            </TabsTrigger>
            <TabsTrigger
              value="vocabulary"
              className="gap-2 text-xs font-semibold px-4 py-2 rounded-lg"
            >
              <Layers className="size-4" />
              <span>Vocabulary ({story.vocabulary.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="grammar"
              className="gap-2 text-xs font-semibold px-4 py-2 rounded-lg"
            >
              <GraduationCap className="size-4" />
              <span>Grammar ({story.grammar_tips.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="quiz"
              className="gap-2 text-xs font-semibold px-4 py-2 rounded-lg"
            >
              <HelpCircle className="size-4" />
              <span>Quiz ({story.quizzes.length})</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "story" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowParallelTranslation(!showParallelTranslation)
                }
                className={`text-xs font-semibold border-neutral-700 ${
                  showParallelTranslation
                    ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                    : "bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                {showParallelTranslation
                  ? "Hide Parallel Translation"
                  : "Show Parallel Translation"}
              </Button>
            </div>
          )}
        </div>

        {/* TAB 1: STORY READING */}
        <TabsContent value="story" className="space-y-6 outline-none">
          <div className="text-xs text-neutral-400 bg-sky-950/30 border border-sky-500/20 px-4 py-2.5 rounded-xl flex items-center gap-2">
            <Sparkles className="size-4 text-sky-400 shrink-0" />
            <span>
              Tip: Tap any word to view vocabulary details, grammatical
              information, and save to your Flashcards deck.
            </span>
          </div>

          <InteractiveStoryText
            content={story.content}
            contentTranslated={story.content_translated}
            vocabulary={story.vocabulary}
            originLanguageName={story.language_pair?.origin_language.name}
            showTranslation={showParallelTranslation}
          />
        </TabsContent>

        {/* TAB 2: VOCABULARY LIST */}
        <TabsContent value="vocabulary" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {story.vocabulary.map((vocab) => (
              <div
                key={vocab.id}
                className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between gap-3 hover:border-neutral-700 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-white">
                        {vocab.word}
                      </h4>
                      {vocab.gender && (
                        <span
                          className={`px-1.5 py-0.2 text-xs font-bold rounded border ${
                            GENDER_BADGE_STYLE[vocab.gender] ||
                            "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {vocab.gender}
                        </span>
                      )}
                    </div>
                    {vocab.part_of_speech && (
                      <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                        {vocab.part_of_speech}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-sky-400">
                    {vocab.translation}
                  </p>

                  {vocab.example_sentence && (
                    <div className="text-xs bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/80 space-y-0.5 mt-2">
                      <p className="text-neutral-200 italic">
                        &ldquo;{vocab.example_sentence}&rdquo;
                      </p>
                      {vocab.example_translation && (
                        <p className="text-neutral-400">
                          {vocab.example_translation}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleSaveVocab(vocab.id)}
                  disabled={
                    vocab.is_saved_as_flashcard || saveFlashcard.isPending
                  }
                  className={`w-full text-xs font-semibold gap-1.5 h-8 mt-1 ${
                    vocab.is_saved_as_flashcard
                      ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                      : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                  }`}
                >
                  {vocab.is_saved_as_flashcard ? (
                    <>
                      <Check className="size-3.5" />
                      In Deck
                    </>
                  ) : (
                    <>
                      <Bookmark className="size-3.5" />
                      Save Flashcard
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: GRAMMAR TIPS */}
        <TabsContent value="grammar" className="space-y-4 outline-none">
          <div className="grid gap-4">
            {story.grammar_tips.map((tip, idx) => (
              <div
                key={tip.id || idx}
                className="p-5 sm:p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3"
              >
                <div className="flex items-center gap-2 text-sky-400">
                  <GraduationCap className="size-5" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {tip.title}
                  </h3>
                </div>

                <p className="text-sm text-neutral-300 leading-relaxed">
                  {tip.explanation}
                </p>

                {tip.example && (
                  <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 block">
                      Contoh Kalimat:
                    </span>
                    <p className="text-sm font-semibold text-white italic">
                      {tip.example}
                    </p>
                    {tip.example_translation && (
                      <p className="text-xs text-neutral-400">
                        {tip.example_translation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: COMPREHENSION QUIZ */}
        <TabsContent value="quiz" className="outline-none">
          <QuizSection storyId={story.id} quizzes={story.quizzes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
