import { Button } from "@linguamaxima/ui/components/button";
import {
  RadioGroup,
  RadioGroupItem,
} from "@linguamaxima/ui/components/radio-group";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "../lib/i18n";
import { useCheckQuizAnswer, useSubmitQuiz } from "../lib/queries";
import type {
  QuestionResult,
  QuizQuestion,
  QuizSubmissionResult,
} from "../types/api";

interface QuizSectionProps {
  storyId: number;
  quizzes: QuizQuestion[];
  onComplete?: () => void;
}

function QuizSummaryScreen({
  onRetry,
  result,
}: {
  onRetry: () => void;
  result: QuizSubmissionResult;
}) {
  const { t } = useTranslation();
  const isPassed = result.score_percentage >= 70;

  return (
    <div className="p-6 sm:p-8 bg-neutral-900/60 border border-neutral-800 rounded-3xl text-center space-y-6 max-w-xl mx-auto">
      <div className="size-16 rounded-full mx-auto flex items-center justify-center bg-sky-500/10 border border-sky-500/30 text-sky-400">
        <Trophy className="size-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">
          {isPassed ? t("quiz.passedTitle") : t("quiz.failedTitle")}
        </h3>
        <p className="text-sm text-neutral-400">
          {isPassed ? t("quiz.passedDesc") : t("quiz.failedDesc")}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-around">
        <div>
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold block">
            {t("quiz.scoreStat")}
          </span>
          <span className="text-3xl font-extrabold text-white">
            {result.score_percentage}%
          </span>
        </div>
        <div className="h-8 w-px bg-neutral-800" />
        <div>
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold block">
            {t("quiz.correctStat")}
          </span>
          <span className="text-3xl font-extrabold text-sky-400">
            {t("quiz.correctOutOf", {
              correct: result.correct_answers,
              total: result.total_questions,
            })}
          </span>
        </div>
      </div>

      {result.results && result.results.length > 0 && (
        <div className="space-y-3 text-left">
          <h4 className="text-xs uppercase tracking-wider text-neutral-300 font-bold">
            {t("quiz.answerReview")}
          </h4>
          {result.results.map((res, i) => (
            <div
              key={res.question_id ?? i}
              className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/50 space-y-2"
            >
              <div className="flex items-start gap-2">
                {res.is_correct ? (
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <p className="text-sm font-semibold text-neutral-200">
                  {res.question}
                </p>
              </div>
              <div className="text-xs pl-6 space-y-1">
                <p className="text-neutral-300">
                  {t("quiz.yourAnswer")}{" "}
                  <span
                    className={
                      res.is_correct
                        ? "text-emerald-400 font-semibold"
                        : "text-rose-400 font-semibold"
                    }
                  >
                    {res.selected_answer}
                  </span>
                </p>
                {!res.is_correct && (
                  <p className="text-emerald-400 font-medium">
                    {t("quiz.correctAnswer")}{" "}
                    <span className="font-semibold">{res.correct_answer}</span>
                  </p>
                )}
                {res.explanation && (
                  <p className="text-neutral-400 italic pt-0.5">
                    {res.explanation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={onRetry}
        className="gap-2 bg-sky-500 hover:bg-sky-600 text-white w-full sm:w-auto px-6 h-11 font-semibold"
      >
        <RotateCcw className="size-4" />
        {t("quiz.retakeQuiz")}
      </Button>
    </div>
  );
}

function QuizCheckFeedback({
  checkedResult,
  fallbackExplanation,
}: {
  checkedResult: QuestionResult;
  fallbackExplanation?: string | null;
}) {
  const { t } = useTranslation();
  const explanation = checkedResult.explanation || fallbackExplanation;

  return (
    <div
      className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-2 animate-in fade-in duration-200 ${
        checkedResult.is_correct
          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
          : "bg-rose-950/30 border-rose-500/40 text-rose-200"
      }`}
    >
      <div className="flex items-center gap-2 font-bold">
        {checkedResult.is_correct ? (
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="size-4 text-rose-400 shrink-0" />
        )}
        <span>
          {checkedResult.is_correct
            ? t("quiz.checkCorrect")
            : t("quiz.checkIncorrect", {
                answer: checkedResult.correct_answer,
              })}
        </span>
      </div>
      {explanation && (
        <div className="pt-1 border-t border-white/10 text-neutral-300 space-y-1">
          <div className="flex items-center gap-1.5 text-sky-400 font-bold uppercase tracking-wider text-xs">
            <Sparkles className="size-3.5" />
            <span>{t("quiz.explanationLabel")}</span>
          </div>
          <p className="leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}

export function QuizSection({
  storyId,
  quizzes,
  onComplete,
}: QuizSectionProps) {
  const { t } = useTranslation();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [checkedResults, setCheckedResults] = useState<
    Record<number, QuestionResult>
  >({});
  const [submissionResult, setSubmissionResult] =
    useState<QuizSubmissionResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkMutation = useCheckQuizAnswer(storyId);
  const submitMutation = useSubmitQuiz(storyId);

  const currentQ = quizzes[currentIdx];
  const isLastQuestion = currentIdx === quizzes.length - 1;
  const currentAnswer = currentQ ? userAnswers[currentQ.id] : undefined;
  const checkedResult = currentQ ? checkedResults[currentQ.id] : undefined;
  const isCurrentChecked = Boolean(checkedResult);

  const handleSelectOption = useCallback(
    (option: string) => {
      if (!currentQ || isCurrentChecked) {
        return;
      }
      setUserAnswers((prev) => ({
        ...prev,
        [currentQ.id]: option,
      }));
    },
    [currentQ, isCurrentChecked]
  );

  const handleCheckAnswer = useCallback(async () => {
    if (!currentQ || !currentAnswer || checkMutation.isPending) {
      return;
    }
    try {
      const result = await checkMutation.mutateAsync({
        question_id: currentQ.id,
        selected_answer: currentAnswer,
      });
      setCheckedResults((prev) => ({
        ...prev,
        [currentQ.id]: result,
      }));
    } catch {
      // Error toast is shown by the mutation hook
    }
  }, [checkMutation, currentAnswer, currentQ]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setSubmitError(null);
      setCurrentIdx((prev) => prev - 1);
    }
  }, [currentIdx]);

  const handleNext = useCallback(async () => {
    setSubmitError(null);
    if (!isLastQuestion) {
      setCurrentIdx((prev) => prev + 1);
      return;
    }
    const payload = Object.entries(userAnswers).map(([qid, ans]) => ({
      question_id: Math.trunc(Number(qid)),
      selected_answer: ans,
    }));
    try {
      const result = await submitMutation.mutateAsync(payload);
      setSubmissionResult(result);
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : t("quiz.submitError")
      );
    }
  }, [isLastQuestion, userAnswers, submitMutation, onComplete, t]);

  const handleRetry = useCallback(() => {
    setUserAnswers({});
    setCheckedResults({});
    setCurrentIdx(0);
    setSubmissionResult(null);
    setSubmitError(null);
  }, []);

  // Keyboard shortcut listener for options (1-4), check (Enter), navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (submissionResult) {
        if (e.key === "r" || e.key === "R") {
          handleRetry();
        }
        return;
      }

      if (!currentQ) {
        return;
      }

      const num = Number(e.key);
      if (num >= 1 && num <= currentQ.options.length && !isCurrentChecked) {
        e.preventDefault();
        const selected = currentQ.options[num - 1];
        if (selected) {
          handleSelectOption(selected);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentAnswer && !isCurrentChecked) {
          handleCheckAnswer();
        } else if (currentAnswer && isCurrentChecked) {
          handleNext();
        }
      } else if (e.key === "ArrowLeft" && currentIdx > 0) {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentQ,
    currentAnswer,
    isCurrentChecked,
    currentIdx,
    submissionResult,
    handleRetry,
    handleSelectOption,
    handleCheckAnswer,
    handleNext,
    handlePrev,
  ]);

  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="p-8 text-center bg-neutral-900/40 rounded-2xl border border-neutral-800 text-neutral-400">
        <HelpCircle className="size-8 mx-auto mb-2 text-neutral-600" />
        <p>{t("quiz.emptyQuiz")}</p>
      </div>
    );
  }

  // ---------------- Summary Screen ----------------
  if (submissionResult) {
    return (
      <QuizSummaryScreen onRetry={handleRetry} result={submissionResult} />
    );
  }

  // ---------------- Question Screen ----------------
  const typeLabels: Record<string, string> = {
    article: t("quiz.articlePractice"),
    fill_blank: t("quiz.fillBlank"),
    multiple_choice: t("quiz.comprehension"),
    true_false: t("quiz.trueFalse"),
  };

  return (
    <div className="p-5 sm:p-7 bg-neutral-900/40 border border-neutral-800/80 rounded-3xl space-y-6 max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700">
            {typeLabels[currentQ.question_type] ||
              t("quiz.questionTypeFallback")}
          </span>
          <span className="text-xs text-neutral-400 hidden sm:inline font-medium">
            {t("quiz.shortcutsHint", { count: currentQ.options.length })}
          </span>
        </div>
        <span className="text-xs font-mono font-semibold text-neutral-400">
          {t("quiz.questionOf", {
            current: currentIdx + 1,
            total: quizzes.length,
          })}
        </span>
      </div>

      {/* Question */}
      <div className="space-y-2">
        <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
          {currentQ.question}
        </h3>
        {currentQ.question_translated && (
          <p className="text-xs sm:text-sm text-neutral-400 italic">
            {t("quiz.hintLabel", { hint: currentQ.question_translated })}
          </p>
        )}
      </div>

      {/* Options using accessible RadioGroup */}
      <RadioGroup
        value={currentAnswer ?? ""}
        onValueChange={handleSelectOption}
        disabled={isCurrentChecked}
        className="gap-3"
      >
        {currentQ.options.map((opt, i) => {
          const isSelected = currentAnswer === opt;
          const isCorrectOption =
            isCurrentChecked && checkedResult?.correct_answer === opt;
          const isWrongSelection =
            isCurrentChecked &&
            isSelected &&
            checkedResult &&
            !checkedResult.is_correct;
          const optId = `quiz-option-${currentQ.id}-${i}`;
          let optionClass =
            "bg-neutral-900/60 border-neutral-800 text-neutral-200 hover:bg-neutral-800/80 hover:border-neutral-700";
          if (isCorrectOption) {
            optionClass =
              "bg-emerald-500/15 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40";
          } else if (isWrongSelection) {
            optionClass =
              "bg-rose-500/15 border-rose-500 text-rose-200 ring-1 ring-rose-500/40";
          } else if (isSelected) {
            optionClass =
              "bg-sky-500/15 border-sky-400 text-sky-200 ring-1 ring-sky-500/40";
          }

          return (
            <label
              key={i}
              htmlFor={optId}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none text-sm sm:text-base font-medium ${optionClass} ${isCurrentChecked ? "cursor-default" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="size-6 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span>{opt}</span>
              </div>
              <RadioGroupItem id={optId} value={opt} className="shrink-0" />
            </label>
          );
        })}
      </RadioGroup>

      {/* Immediate check feedback and explanation */}
      {isCurrentChecked && checkedResult && (
        <QuizCheckFeedback
          checkedResult={checkedResult}
          fallbackExplanation={currentQ.explanation}
        />
      )}

      {submitError && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-rose-400 shrink-0" />
            <span>{submitError}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={submitMutation.isPending}
            className="border-rose-500/40 text-rose-200 hover:bg-rose-900/40 shrink-0"
          >
            {t("common.retry")}
          </Button>
        </div>
      )}

      {/* Navigation and Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="gap-1.5 border-neutral-800 text-xs font-semibold h-10 px-3.5 text-neutral-300 hover:text-white"
        >
          <ChevronLeft className="size-4" />
          <span>{t("quiz.previousQuestion")}</span>
        </Button>

        <div className="flex items-center gap-2">
          {!isCurrentChecked && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCheckAnswer}
              disabled={!currentAnswer || checkMutation.isPending}
              className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs h-10 px-4"
            >
              {t("quiz.checkAnswer")}
            </Button>
          )}

          <Button
            type="button"
            onClick={handleNext}
            disabled={!currentAnswer || submitMutation.isPending}
            className="gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs h-10 px-5"
          >
            <span>
              {isLastQuestion ? t("quiz.submitQuiz") : t("quiz.nextQuestion")}
            </span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
