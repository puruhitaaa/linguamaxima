import { Badge } from "@linguamaxima/ui/components/badge";
import { Button } from "@linguamaxima/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@linguamaxima/ui/components/dropdown-menu";
import { Progress } from "@linguamaxima/ui/components/progress";
import { Skeleton } from "@linguamaxima/ui/components/skeleton";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Pin,
  PinOff,
  Plus,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { JourneyStepWorkspace } from "../components/journey-step-workspace";
import { JourneyTree } from "../components/journey-tree";
import { LearningJourneyModal } from "../components/learning-journey-modal";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import {
  useActivateJourney,
  useJourney,
  useJourneys,
  useToggleJourneyPin,
} from "../lib/queries";
import type {
  JourneyDetail,
  JourneyListItem,
  JourneyStepItem,
} from "../types/api";

const journeyDetailSearchSchema = z.object({
  stepId: z.coerce.number().int().positive().optional(),
});

export const Route = createFileRoute("/journeys/$journeyId")({
  component: JourneyDetailPage,
  validateSearch: (search: Record<string, unknown>) =>
    journeyDetailSearchSchema.parse(search),
});

function findStepById(
  journey: JourneyDetail,
  stepId?: number | null
): JourneyStepItem | null {
  if (!stepId) {
    return null;
  }
  for (const phase of journey.phases) {
    for (const step of phase.steps) {
      if (step.id === stepId) {
        return step;
      }
    }
  }
  return null;
}

function findFirstStep(journey: JourneyDetail): JourneyStepItem | null {
  for (const phase of journey.phases) {
    const [first] = phase.steps;
    if (first) {
      return first;
    }
  }
  return null;
}

function JourneyNotFoundCard({ backLabel }: { backLabel: string }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 text-center space-y-4 max-w-md">
        <h1 className="text-xl font-bold text-white">
          Learning Journey Not Found
        </h1>
        <p className="text-sm text-neutral-400">
          This learning journey may have been deleted or does not exist.
        </p>
        <Link to="/journeys">
          <Button className="bg-sky-500 hover:bg-sky-600 text-white gap-2 cursor-pointer">
            <ArrowLeft className="size-4" />
            <span>{backLabel}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

function JourneyTopActionBar({
  journey,
  otherJourneys,
  switchLabel,
  pinnedLabel,
  newJourneyLabel,
  backLabel,
  getLanguageFlag,
  onSwitchJourney,
  onTogglePin,
}: {
  journey: JourneyDetail;
  otherJourneys: JourneyListItem[];
  switchLabel: string;
  pinnedLabel: string;
  newJourneyLabel: string;
  backLabel: string;
  getLanguageFlag: (code: string) => string;
  onSwitchJourney: (id: number) => void;
  onTogglePin: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        to="/journeys"
        className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>{backLabel}</span>
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 gap-2 text-xs cursor-pointer"
              >
                <ArrowLeftRight className="size-3.5 text-sky-400" />
                <span>{switchLabel}</span>
                <ChevronDown className="size-3.5 text-neutral-400" />
              </Button>
            }
          />
          <DropdownMenuContent
            align="end"
            className="w-80 bg-neutral-900 border-neutral-800 text-neutral-100 p-1.5"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-neutral-400 font-semibold">
                Your Learning Journeys (Non-Blocking)
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-neutral-800" />

              <DropdownMenuItem className="flex items-center justify-between gap-2 rounded-lg bg-sky-500/10 text-sky-200 focus:bg-sky-500/15">
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{journey.title}</p>
                  <p className="text-[10px] text-sky-300">
                    {journey.cefr_level} · Current
                  </p>
                </div>
                <Check className="size-4 text-sky-400 shrink-0" />
              </DropdownMenuItem>

              {otherJourneys.map((other) => (
                <DropdownMenuItem
                  key={other.id}
                  onClick={() => onSwitchJourney(other.id)}
                  className="flex items-center justify-between gap-2 rounded-lg text-neutral-200 focus:bg-neutral-800 focus:text-white cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {other.title}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {getLanguageFlag(
                        other.language_pair?.target_language.code ?? "de"
                      )}{" "}
                      {other.cefr_level} ·{" "}
                      {Math.round(other.progress_percentage)}% complete
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTogglePin}
          className={`border-neutral-700 bg-neutral-900 gap-1.5 text-xs cursor-pointer ${
            journey.is_pinned
              ? "text-amber-300 border-amber-500/40"
              : "text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          {journey.is_pinned ? (
            <>
              <Pin className="size-3.5" />
              <span>{pinnedLabel}</span>
            </>
          ) : (
            <>
              <PinOff className="size-3.5" />
              <span>Pin</span>
            </>
          )}
        </Button>

        <LearningJourneyModal
          trigger={
            <Button
              type="button"
              size="sm"
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-1.5 text-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{newJourneyLabel}</span>
            </Button>
          }
        />
      </div>
    </div>
  );
}

function JourneyDetailPage() {
  const { journeyId } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getLanguageFlag } = useLanguagePair();

  const { data: journey, isLoading, error } = useJourney(journeyId);
  const { data: allJourneys } = useJourneys({ sort_by: "recent" });
  const activateJourney = useActivateJourney();
  const togglePin = useToggleJourneyPin();

  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [showPromptBlueprint, setShowPromptBlueprint] = useState(false);

  const handleSelectStepId = (nextId: number) => {
    setSelectedStepId(nextId);
    navigate({
      params: { journeyId },
      replace: true,
      search: { stepId: nextId },
      to: "/journeys/$journeyId",
    });
  };

  const handleSwitchJourney = async (targetJourneyId: number) => {
    if (String(targetJourneyId) === journeyId) {
      return;
    }
    try {
      await activateJourney.mutateAsync(targetJourneyId);
    } catch {
      // Proceed even if touch fails
    }
    setSelectedStepId(null);
    navigate({
      params: { journeyId: String(targetJourneyId) },
      to: "/journeys/$journeyId",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-36 rounded-3xl bg-neutral-900 border border-neutral-800" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Skeleton className="h-96 lg:col-span-4 rounded-2xl bg-neutral-900 border border-neutral-800" />
            <Skeleton className="h-96 lg:col-span-8 rounded-2xl bg-neutral-900 border border-neutral-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !journey) {
    return <JourneyNotFoundCard backLabel={t("journeys.backToHub")} />;
  }

  const activeStep =
    findStepById(journey, searchParams.stepId) ??
    findStepById(journey, selectedStepId) ??
    findStepById(journey, journey.next_step_id) ??
    findFirstStep(journey);

  const originCode = journey.language_pair?.origin_language.code ?? "en";
  const targetCode = journey.language_pair?.target_language.code ?? "de";
  const otherJourneys = (allJourneys ?? []).filter((j) => j.id !== journey.id);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <JourneyTopActionBar
          journey={journey}
          otherJourneys={otherJourneys}
          switchLabel={t("journeys.switchJourneyLabel")}
          pinnedLabel={t("journeys.pinnedBadge")}
          newJourneyLabel={t("journeys.newJourneyBtn")}
          backLabel={t("journeys.backToHub")}
          getLanguageFlag={getLanguageFlag}
          onSwitchJourney={(id) => {
            handleSwitchJourney(id);
          }}
          onTogglePin={() => togglePin.mutate(journey.id)}
        />

        {/* Journey Overview Hero Banner */}
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-sky-500/40 bg-sky-500/10 text-sky-300 text-xs font-bold"
                >
                  CEFR {journey.cefr_level}
                </Badge>
                {journey.language_pair && (
                  <Badge
                    variant="outline"
                    className="border-neutral-700 bg-neutral-950 text-neutral-200 text-xs"
                  >
                    {getLanguageFlag(originCode)}{" "}
                    {journey.language_pair.origin_language.name} →{" "}
                    {getLanguageFlag(targetCode)}{" "}
                    {journey.language_pair.target_language.name}
                  </Badge>
                )}
                {journey.sector_tag && (
                  <Badge
                    variant="outline"
                    className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs"
                  >
                    {journey.sector_tag}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {journey.title}
              </h1>

              {journey.summary && (
                <p className="text-sm text-neutral-300 max-w-3xl leading-relaxed">
                  {journey.summary}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 min-w-[260px] space-y-2.5 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-400">
                  Overall Mastery
                </span>
                <span className="font-bold text-white">
                  {Math.round(journey.progress_percentage)}%
                </span>
              </div>
              <Progress
                value={journey.progress_percentage}
                className="h-2 bg-neutral-800"
              />
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>
                  {journey.completed_steps}/{journey.total_steps} steps done
                </span>
                <span>
                  {journey.mastered_vocab_count}/{journey.total_vocab_count}{" "}
                  words
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-800/80 pt-3">
            <button
              type="button"
              onClick={() => setShowPromptBlueprint((prev) => !prev)}
              className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <Sparkles className="size-3.5 text-sky-400" />
              <span>Goal Context & Synthesized Curriculum Prompt</span>
              {showPromptBlueprint ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>

            {showPromptBlueprint && (
              <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    Original Purpose
                  </span>
                  <p className="text-neutral-200 mt-0.5">
                    {journey.purpose_input}
                  </p>
                </div>

                {journey.clarifications.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                      Clarifications Provided
                    </span>
                    <ul className="space-y-1 text-neutral-300">
                      {journey.clarifications.map((item) => (
                        <li key={item.question}>
                          <span className="text-neutral-400">
                            {item.question}:
                          </span>{" "}
                          <strong className="text-white">{item.answer}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    Synthesized Prompt Blueprint
                  </span>
                  <p className="text-neutral-300 mt-1 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
                    {journey.synthesized_prompt}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Main 2-Column Tree + Step Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6">
            <JourneyTree
              phases={journey.phases}
              selectedStepId={activeStep?.id}
              nextStepId={journey.next_step_id}
              onSelectStep={(step) => handleSelectStepId(step.id)}
            />
          </aside>

          <main className="lg:col-span-7 xl:col-span-8">
            {activeStep ? (
              <JourneyStepWorkspace
                journey={journey}
                step={activeStep}
                onSelectStepId={handleSelectStepId}
              />
            ) : (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center space-y-2">
                <Compass className="size-8 text-sky-400 mx-auto" />
                <p className="text-sm text-neutral-300">
                  Select any step in your Learning Experience Tree to begin.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
