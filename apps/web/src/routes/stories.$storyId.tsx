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
import {
  GENDER_BADGE_STYLE,
  InteractiveStoryText,
} from "../components/interactive-story-text";
import { QuizSection } from "../components/quiz-section";
import { useTranslation } from "../lib/i18n";
import { useSaveFlashcard, useStory, useToggleFavorite } from "../lib/queries";
import type {
  CEFRLevel,
  GrammarTip,
  StoryDetail,
  VocabularyItem,
} from "../types/api";

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
  A1: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  A2: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  B1: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  B2: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  C1: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  C2: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

function StoryReadingComponent() {
  const { storyId } = Route.useParams();
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const activeTab = searchParams.tab ?? "story";
  const { t } = useTranslation();

  const { data: story, isLoading, error } = useStory(storyId);
  const toggleFavorite = useToggleFavorite();
  const saveFlashcard = useSaveFlashcard();

  const [showParallelTranslation, setShowParallelTranslation] = useState(false);

  const handleTabChange = (tab: string) => {
    navigate({
      search: () => ({
        tab: tab as "story" | "vocabulary" | "grammar" | "quiz",
      }),
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 space-y-6">
        <div className="h-6 w-32 bg-neutral-800 rounded animate-pulse" />
        <div className="h-48 bg-neutral-900 rounded-3xl animate-pulse" />
        <div className="h-96 bg-neutral-900 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">
          {t("story.notFoundTitle")}
        </h2>
        <p className="text-sm text-neutral-400">{t("story.notFoundDesc")}</p>
        <Link
          to="/"
          search={{
            category: "all",
            language_scope: "pair",
            level: "all",
            search: "",
          }}
        >
          <Button variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="size-4" />
            <span>{t("story.backToStories")}</span>
          </Button>
        </Link>
      </div>
    );
  }

  const handleSaveVocab = (vocabId: number) => {
    saveFlashcard.mutate(vocabId);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6">
      {/* Top Bar with Back Link and Actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          search={{
            category: "all",
            language_scope: "pair",
            level: "all",
            search: "",
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>{t("story.backToStories")}</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggleFavorite.mutate(story.id)}
            disabled={
              toggleFavorite.isPending && toggleFavorite.variables === story.id
            }
            className={`gap-1.5 border-neutral-800 text-xs font-semibold rounded-xl h-9 px-3 transition-colors ${
              story.is_favorite
                ? "text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-300"
                : "text-neutral-300 hover:text-white"
            } ${
              toggleFavorite.isPending && toggleFavorite.variables === story.id
                ? "opacity-70"
                : ""
            }`}
          >
            <Heart
              className={`size-3.5 transition-transform active:scale-125 ${
                story.is_favorite ? "fill-rose-400" : ""
              }`}
            />
            <span>
              {story.is_favorite ? t("story.favorited") : t("story.favorite")}
            </span>
          </Button>
        </div>
      </div>

      {/* Story Header Banner */}
      <StoryHeaderBanner story={story} />

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-neutral-800 pb-2">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 rounded-2xl">
            <TabsTrigger
              value="story"
              className="gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
            >
              <BookOpen className="size-4" />
              <span>{t("story.tabStory")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="vocabulary"
              className="gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
            >
              <Layers className="size-4" />
              <span>
                {t("story.tabVocabulary", { count: story.vocabulary.length })}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="grammar"
              className="gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
            >
              <GraduationCap className="size-4" />
              <span>
                {t("story.tabGrammar", { count: story.grammar_tips.length })}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="quiz"
              className="gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
            >
              <HelpCircle className="size-4" />
              <span>{t("story.tabQuiz", { count: story.quizzes.length })}</span>
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
                className={`text-xs font-semibold rounded-xl h-9 px-3.5 border-neutral-700 transition-colors ${
                  showParallelTranslation
                    ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                    : "bg-neutral-900 text-neutral-300 hover:text-white"
                }`}
              >
                {showParallelTranslation
                  ? t("story.hideParallelTranslation")
                  : t("story.showParallelTranslation")}
              </Button>
            </div>
          )}
        </div>

        {/* TAB 1: STORY READING */}
        <TabsContent value="story" className="space-y-6 outline-none">
          {/* Resolved gray-on-color contrast banner */}
          <div className="text-xs font-medium text-sky-200 bg-sky-950/40 border border-sky-500/30 px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-sm">
            <Sparkles className="size-4 text-sky-400 shrink-0" />
            <span>{t("story.tapTip")}</span>
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
        <StoryVocabularyTab
          vocabulary={story.vocabulary}
          onSaveVocab={handleSaveVocab}
          isSaving={saveFlashcard.isPending}
        />

        {/* TAB 3: GRAMMAR TIPS */}
        <StoryGrammarTab grammarTips={story.grammar_tips} />

        {/* TAB 4: COMPREHENSION QUIZ */}
        <TabsContent value="quiz" className="outline-none">
          <QuizSection storyId={story.id} quizzes={story.quizzes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StoryHeaderBanner({ story }: { story: StoryDetail }) {
  const { t, tCategory } = useTranslation();
  const levelColorClass = LEVEL_COLORS[story.cefr_level] || LEVEL_COLORS.A1;

  return (
    <header className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4 shadow-lg">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${levelColorClass}`}
        >
          {t("story.levelBadge", { level: story.cefr_level })}
        </span>
        {story.language_pair && (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-300">
            {story.language_pair.target_language.name} ←{" "}
            {story.language_pair.origin_language.name}
          </span>
        )}
        {story.category && (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md border border-neutral-700 bg-neutral-800 text-neutral-300">
            {tCategory(story.category.slug)}
          </span>
        )}
        <span className="text-xs text-neutral-400 font-medium ml-auto">
          {t("story.readingStats", {
            minutes: story.estimated_reading_minutes,
            words: story.word_count,
          })}
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
        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed border-t border-neutral-800/80 pt-3 italic">
          <span className="font-semibold text-neutral-400 not-italic">
            {t("story.summaryLabel")}{" "}
          </span>
          {story.summary}
        </p>
      )}

      {/* Audio Player */}
      {story.audio_url && (
        <div className="pt-2">
          <AudioPlayer audioUrl={story.audio_url} storyTitle={story.title} />
        </div>
      )}
    </header>
  );
}

function StoryVocabularyTab({
  vocabulary,
  onSaveVocab,
  isSaving,
}: {
  vocabulary: VocabularyItem[];
  onSaveVocab: (vocabId: number) => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();

  return (
    <TabsContent value="vocabulary" className="space-y-4 outline-none">
      <h2 className="sr-only">Story Vocabulary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vocabulary.map((vocab) => (
          <div
            key={vocab.id}
            className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between gap-3 hover:border-neutral-700 transition-colors shadow-sm"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{vocab.word}</h3>
                  {vocab.gender && (
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-md border ${
                        GENDER_BADGE_STYLE[vocab.gender.toLowerCase()] ||
                        "bg-neutral-800 text-neutral-300 border-neutral-700"
                      }`}
                    >
                      {vocab.gender}
                    </span>
                  )}
                </div>
                {vocab.part_of_speech && (
                  <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
                    {vocab.part_of_speech}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-sky-400">
                {vocab.translation}
              </p>

              {vocab.example_sentence && (
                <div className="text-xs bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80 space-y-0.5 mt-2">
                  <p className="text-neutral-200 italic font-medium">
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
              onClick={() => onSaveVocab(vocab.id)}
              disabled={vocab.is_saved_as_flashcard || isSaving}
              className={`w-full text-xs font-semibold gap-1.5 h-10 rounded-xl mt-1 ${
                vocab.is_saved_as_flashcard
                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white"
              }`}
            >
              {vocab.is_saved_as_flashcard ? (
                <>
                  <Check className="size-4" />
                  <span>{t("story.savedInDeck")}</span>
                </>
              ) : (
                <>
                  <Bookmark className="size-4" />
                  <span>{t("story.saveFlashcard")}</span>
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </TabsContent>
  );
}

function StoryGrammarTab({ grammarTips }: { grammarTips: GrammarTip[] }) {
  const { t } = useTranslation();

  return (
    <TabsContent value="grammar" className="space-y-4 outline-none">
      <h2 className="sr-only">Grammar Tips</h2>
      <div className="grid gap-4">
        {grammarTips.map((tip, idx) => (
          <div
            key={tip.id || idx}
            className="p-5 sm:p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-3 shadow-sm"
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
              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                <span className="text-xs uppercase font-bold tracking-wider text-sky-400 block">
                  {t("story.grammarExampleLabel")}
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
  );
}
