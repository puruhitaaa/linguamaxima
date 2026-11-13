import { Badge } from "@linguamaxima/ui/components/badge";
import { Progress } from "@linguamaxima/ui/components/progress";
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GitBranch,
  Layers,
  Sparkles,
} from "lucide-react";

import { useTranslation } from "../lib/i18n";
import type {
  JourneyPhaseItem,
  JourneyStepItem,
  JourneyStepType,
} from "../types/api";

interface JourneyTreeProps {
  nextStepId?: number | null;
  onSelectStep: (step: JourneyStepItem) => void;
  phases: JourneyPhaseItem[];
  selectedStepId?: number | null;
}

const STEP_ICONS: Record<JourneyStepType, typeof Layers> = {
  checkpoint: ClipboardCheck,
  story_lesson: BookOpen,
  vocab_pack: Layers,
};

const STEP_LABELS: Record<JourneyStepType, string> = {
  checkpoint: "Checkpoint",
  story_lesson: "Story Lesson",
  vocab_pack: "Vocab Pack",
};

function getStepButtonClass(
  isSelected: boolean,
  isRecommended: boolean,
  isCompleted: boolean
): string {
  if (isSelected) {
    return "border-sky-500 bg-sky-500/10 shadow-sm shadow-sky-500/10";
  }
  if (isRecommended) {
    return "border-amber-500/50 bg-amber-500/5 hover:border-amber-400 hover:bg-amber-500/10";
  }
  if (isCompleted) {
    return "border-emerald-500/25 bg-neutral-950/70 hover:border-emerald-500/50";
  }
  return "border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-900";
}

function getStepIconWrapClass(
  isSelected: boolean,
  isRecommended: boolean,
  isCompleted: boolean
): string {
  if (isCompleted) {
    return "bg-emerald-500/15 border-emerald-500/40 text-emerald-300";
  }
  if (isRecommended) {
    return "bg-amber-500/15 border-amber-500/40 text-amber-300";
  }
  if (isSelected) {
    return "bg-sky-500/20 border-sky-400/50 text-sky-300";
  }
  return "bg-neutral-900 border-neutral-700 text-neutral-300 group-hover:text-white";
}

export function JourneyTree({
  phases,
  selectedStepId,
  nextStepId,
  onSelectStep,
}: JourneyTreeProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
          <GitBranch className="size-4 text-sky-400" />
          <span>Learning Experience Tree</span>
        </div>
        <span className="text-[11px] text-neutral-400">
          {phases.length} {phases.length === 1 ? "phase" : "phases"}
        </span>
      </div>

      <div className="space-y-6">
        {phases.map((phase) => {
          const totalPhaseSteps = phase.steps.length || 1;
          const completedPhaseSteps = phase.steps.filter(
            (s) => s.is_completed
          ).length;
          const phasePercent = Math.round(
            (completedPhaseSteps / totalPhaseSteps) * 100
          );
          const allDone = completedPhaseSteps === phase.steps.length;

          return (
            <div
              key={phase.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-4"
            >
              {/* Phase Trunk Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`shrink-0 size-7 rounded-lg flex items-center justify-center text-xs font-extrabold border ${
                        allDone
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : "bg-sky-500/15 border-sky-500/40 text-sky-300"
                      }`}
                    >
                      {phase.phase_number}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {phase.title}
                      </h3>
                      {phase.title_translated && (
                        <p className="text-xs text-neutral-400 truncate">
                          {phase.title_translated}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] font-bold ${
                      allDone
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-neutral-700 bg-neutral-950 text-neutral-300"
                    }`}
                  >
                    {completedPhaseSteps}/{phase.steps.length}
                  </Badge>
                </div>

                {phase.milestone_goal && (
                  <p className="text-xs text-neutral-400 leading-relaxed pl-9">
                    {phase.milestone_goal}
                  </p>
                )}

                <div className="pl-9">
                  <Progress
                    value={phasePercent}
                    className="h-1 bg-neutral-800"
                  />
                </div>
              </div>

              {/* Phase Branch Nodes */}
              <div className="relative pl-4 space-y-2.5 before:absolute before:left-[13px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-800">
                {phase.steps.map((step) => {
                  const Icon = STEP_ICONS[step.step_type];
                  const isSelected = step.id === selectedStepId;
                  const isRecommended =
                    !step.is_completed && step.id === nextStepId;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => onSelectStep(step)}
                      className={`relative w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${getStepButtonClass(
                        isSelected,
                        isRecommended,
                        step.is_completed
                      )}`}
                    >
                      <span
                        className={`shrink-0 mt-0.5 size-7 rounded-lg flex items-center justify-center border transition-colors ${getStepIconWrapClass(
                          isSelected,
                          isRecommended,
                          step.is_completed
                        )}`}
                      >
                        {step.is_completed ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            {STEP_LABELS[step.step_type]}
                          </span>
                          {isRecommended && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0 h-4 gap-1">
                              <Sparkles className="size-2.5" />
                              {t("journeys.nextRecommendedBadge")}
                            </Badge>
                          )}
                          {step.is_completed && (
                            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0 h-4">
                              {t("journeys.completedBadge")}
                            </Badge>
                          )}
                          {step.best_score !== null &&
                            step.best_score !== undefined && (
                              <Badge
                                variant="outline"
                                className="border-neutral-700 text-neutral-300 text-[10px] px-1.5 py-0 h-4"
                              >
                                {Math.round(step.best_score)}%
                              </Badge>
                            )}
                        </div>

                        <p className="text-sm font-semibold text-white leading-snug">
                          {step.title}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                          {step.vocabularies.length > 0 && (
                            <span>{step.vocabularies.length} words</span>
                          )}
                          {step.step_type === "checkpoint" &&
                            step.checkpoint_questions.length > 0 && (
                              <span>
                                {step.checkpoint_questions.length} questions
                              </span>
                            )}
                          {step.step_type === "story_lesson" &&
                            step.is_story_prepared && (
                              <span className="text-sky-400">Story Ready</span>
                            )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
