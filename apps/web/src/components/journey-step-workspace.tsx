import { Badge } from "@linguamaxima/ui/components/badge";
import { Button } from "@linguamaxima/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linguamaxima/ui/components/card";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { playPronunciationAudio } from "../lib/audio";
import { useTranslation } from "../lib/i18n";
import {
  useCompleteJourneyStep,
  usePrepareJourneyStep,
  useSaveJourneyVocabFlashcard,
  useSaveStepVocabsBulk,
} from "../lib/queries";
import type {
  CheckpointAnswerSubmission,
  JourneyDetail,
  JourneyStepCompleteResult,
  JourneyStepItem,
  JourneyStepType,
  JourneyVocabularyItem,
} from "../types/api";

interface JourneyStepWorkspaceProps {
  journey: JourneyDetail;
  onSelectStepId: (stepId: number) => void;
  step: JourneyStepItem;
}

const GENDER_COLORS: Record<string, string> = {
  das: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  der: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  die: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const STEP_TYPE_BADGES: Record<JourneyStepType, string> = {
  checkpoint: "Milestone Checkpoint",
  story_lesson: "Contextual Story Lesson",
  vocab_pack: "Vocabulary Pack",
};

function getGenderColor(gender?: string | null): string {
  if (gender && GENDER_COLORS[gender]) {
    return GENDER_COLORS[gender];
  }
  return "bg-neutral-800 text-neutral-300 border-neutral-700";
}

function getCheckpointOptionClass(
  isSelected: boolean,
  isCorrectOption: boolean,
  isWrongSelected: boolean
): string {
  if (isCorrectOption) {
    return "border-emerald-500 bg-emerald-500/15 text-emerald-200";
  }
  if (isWrongSelected) {
    return "border-rose-500 bg-rose-500/15 text-rose-200";
  }
  if (isSelected) {
    return "border-sky-500 bg-sky-500/15 text-white";
  }
  return "border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700";
}

function getCompleteButtonLabel(
  isCompleted: boolean,
  hasNextStep: boolean,
  completedLabel: string,
  completeStepLabel: string
): string {
  if (!isCompleted) {
    return completeStepLabel;
  }
  return hasNextStep ? "Go to Next Step" : completedLabel;
}

function findNextStepAfter(
  journey: JourneyDetail,
  currentStepId: number
): JourneyStepItem | null {
  const flatSteps: JourneyStepItem[] = [];
  for (const phase of journey.phases) {
    for (const s of phase.steps) {
      flatSteps.push(s);
    }
  }
  const idx = flatSteps.findIndex((s) => s.id === currentStepId);
  if (idx !== -1 && idx + 1 < flatSteps.length) {
    return flatSteps[idx + 1] ?? null;
  }
  return null;
}

function VocabCardGrid({
  vocabularies,
  stepType,
  recallMode,
  revealedIds,
  playingVocabId,
  isSavingOne,
  onToggleReveal,
  onPlayAudio,
  onSaveOne,
}: {
  vocabularies: JourneyVocabularyItem[];
  stepType: JourneyStepType;
  recallMode: boolean;
  revealedIds: Set<number>;
  playingVocabId: number | null;
  isSavingOne: boolean;
  onToggleReveal: (vocabId: number) => void;
  onPlayAudio: (vocab: JourneyVocabularyItem) => void;
  onSaveOne: (vocab: JourneyVocabularyItem) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          {stepType === "story_lesson"
            ? `Target Vocabulary Used in This Story (${vocabularies.length})`
            : `Target Domain Vocabulary (${vocabularies.length})`}
        </h4>
        {recallMode && (
          <span className="text-xs text-amber-300">
            Click reveal button on any card to check meaning
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {vocabularies.map((vocab) => {
          const isHidden = recallMode && !revealedIds.has(vocab.id);
          const isPlaying = playingVocabId === vocab.id;

          return (
            <div
              key={vocab.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950/90 hover:border-neutral-700 p-4 space-y-2.5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {vocab.gender && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-5 font-bold ${getGenderColor(
                          vocab.gender
                        )}`}
                      >
                        {vocab.gender}
                      </Badge>
                    )}
                    <span className="text-base font-bold text-white">
                      {vocab.word}
                    </span>
                    {vocab.part_of_speech && (
                      <span className="text-[11px] text-neutral-400">
                        ({vocab.part_of_speech})
                      </span>
                    )}
                  </div>
                  {vocab.phonetic && (
                    <p className="text-xs font-mono text-neutral-400">
                      /{vocab.phonetic}/
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Play pronunciation for ${vocab.word}`}
                    onClick={() => onPlayAudio(vocab)}
                    className={`size-8 rounded-lg cursor-pointer ${
                      isPlaying
                        ? "text-sky-400 bg-sky-500/15"
                        : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                    }`}
                  >
                    <Volume2 className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Save ${vocab.word} to flashcards`}
                    disabled={vocab.is_saved_as_flashcard || isSavingOne}
                    onClick={() => onSaveOne(vocab)}
                    className={`size-8 rounded-lg cursor-pointer ${
                      vocab.is_saved_as_flashcard
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-neutral-300 hover:text-sky-300 hover:bg-neutral-800"
                    }`}
                  >
                    {vocab.is_saved_as_flashcard ? (
                      <BookmarkCheck className="size-4" />
                    ) : (
                      <Bookmark className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm font-medium text-sky-300">
                {isHidden ? (
                  <button
                    type="button"
                    onClick={() => onToggleReveal(vocab.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-xs text-neutral-200 transition-colors cursor-pointer"
                  >
                    <Eye className="size-3.5" />
                    <span>Reveal translation</span>
                  </button>
                ) : (
                  vocab.translation
                )}
              </div>

              {vocab.example_sentence && !isHidden && (
                <div className="pt-2 border-t border-neutral-800/80 space-y-0.5 text-xs">
                  <p className="text-neutral-200 leading-relaxed">
                    “{vocab.example_sentence}”
                  </p>
                  {vocab.example_translation && (
                    <p className="text-neutral-400">
                      {vocab.example_translation}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StoryLessonBanner({
  step,
  isPreparing,
  onPrepareAndOpen,
  onOpenExisting,
}: {
  step: JourneyStepItem;
  isPreparing: boolean;
  onPrepareAndOpen: () => void;
  onOpenExisting: () => void;
}) {
  const isReady = Boolean(step.is_story_prepared && step.story_id);

  return (
    <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-neutral-950 to-neutral-950 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <BookOpen className="size-4 text-sky-400" />
            <span>
              {isReady
                ? "Your Contextual Story Is Ready"
                : "Generate Personalized Story & Audio"}
            </span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
            {isReady
              ? "Open LinguaMaxima's interactive reader with clickable vocabulary definitions, parallel translations, and neural audio narration."
              : "When you are ready, we will generate an authentic scenario story weaving every target vocabulary word above into context, complete with audio narration."}
          </p>
        </div>

        {isReady ? (
          <Button
            type="button"
            onClick={onOpenExisting}
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2 shrink-0 cursor-pointer"
          >
            <BookOpen className="size-4" />
            <span>Open Interactive Story</span>
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onPrepareAndOpen}
            disabled={isPreparing}
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2 shrink-0 cursor-pointer"
          >
            {isPreparing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Composing Story & Audio...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Prepare Story & Open Reader</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function CheckpointQuizSection({
  step,
  selectedAnswers,
  checkpointResult,
  nextStep,
  onSelectAnswer,
  onSelectNextStep,
}: {
  step: JourneyStepItem;
  selectedAnswers: Record<string, string>;
  checkpointResult: JourneyStepCompleteResult | null;
  nextStep: JourneyStepItem | null;
  onSelectAnswer: (questionId: string, option: string) => void;
  onSelectNextStep: (stepId: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
        <ClipboardCheck className="size-4 text-emerald-400" />
        <span>
          Situational & Vocabulary Check ({step.checkpoint_questions.length}{" "}
          questions)
        </span>
      </div>

      {checkpointResult && (
        <div
          className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
            checkpointResult.passed
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          <div className="space-y-0.5">
            <p className="text-sm font-bold">
              {checkpointResult.passed
                ? `Checkpoint Passed! Score: ${Math.round(checkpointResult.score_percentage ?? 100)}%`
                : `Score: ${Math.round(checkpointResult.score_percentage ?? 0)}% (60% recommended to pass)`}
            </p>
            <p className="text-xs opacity-90">
              Review your answers below. You can retry anytime or continue to
              the next step.
            </p>
          </div>
          {nextStep && (
            <Button
              type="button"
              size="sm"
              onClick={() => onSelectNextStep(nextStep.id)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {step.checkpoint_questions.map((question, qIndex) => {
          const chosen = selectedAnswers[question.id];
          const graded = checkpointResult?.results.find(
            (r) => r.question_id === question.id
          );

          return (
            <div
              key={question.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Question {qIndex + 1} · {question.question_type}
                </span>
                <p className="text-sm font-semibold text-white">
                  {question.question}
                </p>
                {question.question_translated && (
                  <p className="text-xs text-neutral-400">
                    {question.question_translated}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {question.options.map((option) => {
                  const isSelected = chosen === option;
                  const isCorrectOption = Boolean(
                    graded && graded.correct_answer === option
                  );
                  const isWrongSelected = Boolean(
                    graded && isSelected && !graded.is_correct
                  );

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onSelectAnswer(question.id, option)}
                      className={`text-left px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-between gap-2 cursor-pointer ${getCheckpointOptionClass(
                        isSelected,
                        isCorrectOption,
                        isWrongSelected
                      )}`}
                    >
                      <span>{option}</span>
                      {isCorrectOption && (
                        <Check className="size-4 text-emerald-400 shrink-0" />
                      )}
                      {isWrongSelected && (
                        <XCircle className="size-4 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {graded?.explanation && (
                <p className="text-xs text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
                  {graded.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepHeaderSection({
  step,
  recallMode,
  unsavedCount,
  isSavingBulk,
  completedBadgeLabel,
  saveAllLabel,
  onToggleRecall,
  onSaveAll,
}: {
  step: JourneyStepItem;
  recallMode: boolean;
  unsavedCount: number;
  isSavingBulk: boolean;
  completedBadgeLabel: string;
  saveAllLabel: string;
  onToggleRecall: () => void;
  onSaveAll: () => void;
}) {
  return (
    <CardHeader className="border-b border-neutral-800/80 pb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-semibold"
          >
            {STEP_TYPE_BADGES[step.step_type]}
          </Badge>
          {step.is_completed && (
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs gap-1">
              <CheckCircle2 className="size-3.5" />
              {completedBadgeLabel}
            </Badge>
          )}
        </div>

        {step.vocabularies.length > 0 && (
          <div className="flex items-center gap-2">
            {step.step_type === "vocab_pack" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onToggleRecall}
                className="border-neutral-700 bg-neutral-950 text-neutral-200 hover:bg-neutral-800 gap-1.5 text-xs cursor-pointer"
              >
                {recallMode ? (
                  <>
                    <Eye className="size-3.5" />
                    <span>Show Translations</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="size-3.5" />
                    <span>Recall Check</span>
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onSaveAll}
              disabled={isSavingBulk || unsavedCount === 0}
              className="border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 gap-1.5 text-xs cursor-pointer"
            >
              {isSavingBulk ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Layers className="size-3.5" />
              )}
              <span>
                {unsavedCount === 0
                  ? "All in Flashcards"
                  : `${saveAllLabel} (${unsavedCount})`}
              </span>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <CardTitle className="text-xl sm:text-2xl font-bold text-white">
          {step.title}
        </CardTitle>
        {step.title_translated && (
          <p className="text-sm text-neutral-400">{step.title_translated}</p>
        )}
        {step.description && (
          <CardDescription className="text-neutral-300 pt-1 leading-relaxed">
            {step.description}
          </CardDescription>
        )}
      </div>

      {step.grammar_focus && (
        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-2.5 text-xs text-indigo-200 flex items-start gap-2">
          <Sparkles className="size-4 text-indigo-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-indigo-100">Grammar Focus: </span>
            <span>{step.grammar_focus}</span>
          </div>
        </div>
      )}
    </CardHeader>
  );
}

function StepFooterSection({
  step,
  nextStep,
  allQuestionsAnswered,
  isCompleting,
  completedBadgeLabel,
  completeStepLabel,
  onSubmitCheckpoint,
  onCompleteSimpleStep,
}: {
  step: JourneyStepItem;
  nextStep: JourneyStepItem | null;
  allQuestionsAnswered: boolean;
  isCompleting: boolean;
  completedBadgeLabel: string;
  completeStepLabel: string;
  onSubmitCheckpoint: () => void;
  onCompleteSimpleStep: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-800">
      <div className="text-xs text-neutral-400">
        {nextStep ? (
          <span>
            Up next:{" "}
            <strong className="text-neutral-200">{nextStep.title}</strong>
          </span>
        ) : (
          <span>Final step of this learning journey</span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {step.step_type === "checkpoint" ? (
          <Button
            type="button"
            onClick={onSubmitCheckpoint}
            disabled={!allQuestionsAnswered || isCompleting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-2 cursor-pointer"
          >
            {isCompleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            <span>Submit Checkpoint</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onCompleteSimpleStep}
            disabled={isCompleting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-2 cursor-pointer"
          >
            {isCompleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            <span>
              {getCompleteButtonLabel(
                step.is_completed,
                Boolean(nextStep),
                completedBadgeLabel,
                completeStepLabel
              )}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function JourneyStepWorkspace({
  journey,
  step,
  onSelectStepId,
}: JourneyStepWorkspaceProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const targetLanguageCode =
    journey.language_pair?.target_language.code ?? "de";

  const [stepUiState, setStepUiState] = useState<{
    stepId: number;
    recallMode: boolean;
    revealedIds: Set<number>;
    selectedAnswers: Record<string, string>;
    checkpointResult: JourneyStepCompleteResult | null;
  }>({
    checkpointResult: null,
    recallMode: false,
    revealedIds: new Set(),
    selectedAnswers: {},
    stepId: step.id,
  });

  const activeState =
    stepUiState.stepId === step.id
      ? stepUiState
      : {
          checkpointResult: null,
          recallMode: false,
          revealedIds: new Set<number>(),
          selectedAnswers: {},
          stepId: step.id,
        };

  const [playingVocabId, setPlayingVocabId] = useState<number | null>(null);

  const prepareStep = usePrepareJourneyStep();
  const completeStep = useCompleteJourneyStep();
  const saveVocabFlashcard = useSaveJourneyVocabFlashcard();
  const saveBulkFlashcards = useSaveStepVocabsBulk();

  const updateActiveState = (
    updater: (prev: typeof activeState) => typeof activeState
  ) => {
    setStepUiState((prev) => {
      const base =
        prev.stepId === step.id
          ? prev
          : {
              checkpointResult: null,
              recallMode: false,
              revealedIds: new Set<number>(),
              selectedAnswers: {},
              stepId: step.id,
            };
      return updater(base);
    });
  };

  const handleToggleReveal = (vocabId: number) => {
    updateActiveState((prev) => {
      const next = new Set(prev.revealedIds);
      if (next.has(vocabId)) {
        next.delete(vocabId);
      } else {
        next.add(vocabId);
      }
      return { ...prev, revealedIds: next };
    });
  };

  const handlePlayAudio = async (vocab: JourneyVocabularyItem) => {
    setPlayingVocabId(vocab.id);
    await playPronunciationAudio({
      languageCode: targetLanguageCode,
      onEnd: () => setPlayingVocabId(null),
      onError: () => setPlayingVocabId(null),
      t: (key) => t(key as Parameters<typeof t>[0]),
      url: vocab.pronunciation_url,
      word: vocab.word,
    });
  };

  const handleSaveOneVocab = (vocab: JourneyVocabularyItem) => {
    saveVocabFlashcard.mutate(
      { journeyId: journey.id, vocabId: vocab.id },
      {
        onError: () => toast.error("Failed to save vocabulary to flashcards."),
        onSuccess: () => toast.success(`Saved "${vocab.word}" to Flashcards`),
      }
    );
  };

  const handleSaveAllVocabs = () => {
    saveBulkFlashcards.mutate(
      { journeyId: journey.id, stepId: step.id },
      {
        onError: () => toast.error("Failed to save vocabulary pack."),
        onSuccess: (res) => {
          if (res.saved_count > 0) {
            toast.success(
              `Added ${res.saved_count} new word(s) to your Flashcards deck`
            );
          } else {
            toast.info("All words in this step are already in your deck");
          }
        },
      }
    );
  };

  const handleCompleteSimpleStep = async () => {
    try {
      await completeStep.mutateAsync({
        journeyId: journey.id,
        stepId: step.id,
      });
      toast.success(`Completed: ${step.title}`);
      const nextStep = findNextStepAfter(journey, step.id);
      if (nextStep) {
        onSelectStepId(nextStep.id);
      }
    } catch {
      toast.error("Could not mark step as completed.");
    }
  };

  const handlePrepareAndOpenStory = async () => {
    try {
      const res = await prepareStep.mutateAsync({
        journeyId: journey.id,
        stepId: step.id,
      });
      const storyId = res.story_id ?? step.story_id;
      if (storyId) {
        navigate({
          params: { storyId: String(storyId) },
          search: {
            journeyId: journey.id,
            stepId: step.id,
            tab: "story",
          },
          to: "/stories/$storyId",
        });
      }
    } catch {
      toast.error("Failed to prepare story lesson. Please try again.");
    }
  };

  const handleOpenExistingStory = () => {
    if (!step.story_id) {
      return;
    }
    navigate({
      params: { storyId: String(step.story_id) },
      search: {
        journeyId: journey.id,
        stepId: step.id,
        tab: "story",
      },
      to: "/stories/$storyId",
    });
  };

  const handleSubmitCheckpoint = async () => {
    const submissions: CheckpointAnswerSubmission[] =
      step.checkpoint_questions.map((q) => ({
        question_id: q.id,
        selected_answer: activeState.selectedAnswers[q.id] ?? "",
      }));

    try {
      const res = await completeStep.mutateAsync({
        journeyId: journey.id,
        quizAnswers: submissions,
        stepId: step.id,
      });
      updateActiveState((prev) => ({ ...prev, checkpointResult: res }));
      if (res.passed) {
        toast.success(
          `Checkpoint passed (${Math.round(res.score_percentage ?? 100)}%)!`
        );
      } else {
        toast.warning(
          `Scored ${Math.round(res.score_percentage ?? 0)}% — review and retry or proceed anytime.`
        );
      }
    } catch {
      toast.error("Failed to grade checkpoint.");
    }
  };

  const unsavedCount = step.vocabularies.filter(
    (v) => !v.is_saved_as_flashcard
  ).length;
  const nextStep = findNextStepAfter(journey, step.id);
  const allQuestionsAnswered =
    step.checkpoint_questions.length > 0 &&
    step.checkpoint_questions.every((q) =>
      Boolean(activeState.selectedAnswers[q.id])
    );

  return (
    <Card className="border-neutral-800 bg-neutral-900/80 text-neutral-100 rounded-2xl shadow-lg">
      <StepHeaderSection
        step={step}
        recallMode={activeState.recallMode}
        unsavedCount={unsavedCount}
        isSavingBulk={saveBulkFlashcards.isPending}
        completedBadgeLabel={t("journeys.completedBadge")}
        saveAllLabel={t("journeys.saveAllFlashcards")}
        onToggleRecall={() =>
          updateActiveState((prev) => ({
            ...prev,
            recallMode: !prev.recallMode,
          }))
        }
        onSaveAll={handleSaveAllVocabs}
      />

      <CardContent className="pt-6 space-y-6">
        {step.vocabularies.length > 0 && (
          <VocabCardGrid
            vocabularies={step.vocabularies}
            stepType={step.step_type}
            recallMode={activeState.recallMode}
            revealedIds={activeState.revealedIds}
            playingVocabId={playingVocabId}
            isSavingOne={saveVocabFlashcard.isPending}
            onToggleReveal={handleToggleReveal}
            onPlayAudio={(v) => {
              handlePlayAudio(v);
            }}
            onSaveOne={handleSaveOneVocab}
          />
        )}

        {step.step_type === "story_lesson" && (
          <StoryLessonBanner
            step={step}
            isPreparing={prepareStep.isPending}
            onPrepareAndOpen={() => {
              handlePrepareAndOpenStory();
            }}
            onOpenExisting={handleOpenExistingStory}
          />
        )}

        {step.step_type === "checkpoint" && (
          <CheckpointQuizSection
            step={step}
            selectedAnswers={activeState.selectedAnswers}
            checkpointResult={activeState.checkpointResult}
            nextStep={nextStep}
            onSelectAnswer={(questionId, option) =>
              updateActiveState((prev) => ({
                ...prev,
                selectedAnswers: {
                  ...prev.selectedAnswers,
                  [questionId]: option,
                },
              }))
            }
            onSelectNextStep={onSelectStepId}
          />
        )}

        <StepFooterSection
          step={step}
          nextStep={nextStep}
          allQuestionsAnswered={allQuestionsAnswered}
          isCompleting={completeStep.isPending}
          completedBadgeLabel={t("journeys.completedBadge")}
          completeStepLabel={t("journeys.completeStepBtn")}
          onSubmitCheckpoint={() => {
            handleSubmitCheckpoint();
          }}
          onCompleteSimpleStep={() => {
            handleCompleteSimpleStep();
          }}
        />
      </CardContent>
    </Card>
  );
}
