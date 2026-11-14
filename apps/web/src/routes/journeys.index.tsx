import { Badge } from "@linguamaxima/ui/components/badge";
import { Button } from "@linguamaxima/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@linguamaxima/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@linguamaxima/ui/components/dialog";
import { Input } from "@linguamaxima/ui/components/input";
import { Progress } from "@linguamaxima/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@linguamaxima/ui/components/select";
import { Skeleton } from "@linguamaxima/ui/components/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpDown,
  Bookmark,
  CheckCircle2,
  Compass,
  Globe,
  ListFilter,
  Pin,
  PinOff,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { LearningJourneyModal } from "../components/learning-journey-modal";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import {
  useActivateJourney,
  useDeleteJourney,
  useJourneys,
  useToggleJourneyPin,
} from "../lib/queries";
import type { CEFRLevel, JourneyListItem, JourneySortBy } from "../types/api";

const JOURNEY_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const JOURNEY_STATUS_FILTERS = [
  "pinned",
  "in_progress",
  "not_started",
  "completed",
] as const;
const JOURNEY_SORT_OPTIONS = [
  "recent",
  "progress_desc",
  "progress_asc",
  "newest",
  "oldest",
  "level_asc",
  "level_desc",
  "title_asc",
] as const;

const journeysSearchSchema = z.object({
  lang: z.string().optional(),
  level: z.preprocess(
    (v) =>
      typeof v === "string" && (JOURNEY_LEVELS as readonly string[]).includes(v)
        ? v
        : undefined,
    z.enum(JOURNEY_LEVELS).optional()
  ),
  search: z.string().optional(),
  sort: z.preprocess(
    (v) =>
      typeof v === "string" &&
      (JOURNEY_SORT_OPTIONS as readonly string[]).includes(v)
        ? v
        : undefined,
    z.enum(JOURNEY_SORT_OPTIONS).optional()
  ),
  status: z.preprocess(
    (v) =>
      typeof v === "string" &&
      (JOURNEY_STATUS_FILTERS as readonly string[]).includes(v)
        ? v
        : undefined,
    z.enum(JOURNEY_STATUS_FILTERS).optional()
  ),
});

export const Route = createFileRoute("/journeys/")({
  component: JourneysHubPage,
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = journeysSearchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
});

const CEFR_FILTERS: readonly ("all" | CEFRLevel)[] = [
  "all",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
];

type StatusFilter = "all" | (typeof JOURNEY_STATUS_FILTERS)[number];

const LEVEL_BADGE_CLASSES: Record<CEFRLevel, string> = {
  A1: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  A2: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  B1: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  B2: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  C1: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  C2: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

function JourneysEmptyState({
  hasActiveFilters,
  onClearFilters,
  emptyTitle,
  emptyDesc,
  newJourneyLabel,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  emptyTitle: string;
  emptyDesc: string;
  newJourneyLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/40 p-12 text-center space-y-4 max-w-xl mx-auto">
      <div className="size-14 rounded-2xl mx-auto flex items-center justify-center bg-sky-500/10 border border-sky-500/30 text-sky-400">
        <Sparkles className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-white">{emptyTitle}</h2>
        <p className="text-sm text-neutral-400">{emptyDesc}</p>
      </div>
      {hasActiveFilters ? (
        <Button
          type="button"
          variant="outline"
          onClick={onClearFilters}
          className="border-neutral-700 text-neutral-200 hover:bg-neutral-800 cursor-pointer"
        >
          Clear Active Filters
        </Button>
      ) : (
        <LearningJourneyModal
          trigger={
            <Button className="bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2 cursor-pointer">
              <Plus className="size-4" />
              <span>{newJourneyLabel}</span>
            </Button>
          }
        />
      )}
    </div>
  );
}

function JourneysFilterBar({
  availableLanguages,
  getLanguageFlag,
  hasActiveFilters,
  levelFilter,
  onClearFilters,
  onClearSearch,
  onLevelChange,
  onSearchChange,
  onSortChange,
  onStatusChange,
  onTargetLangChange,
  searchInput,
  sortBy,
  statusFilter,
  t,
  targetLangFilter,
}: {
  availableLanguages: { code: string; name: string }[];
  getLanguageFlag: (code: string) => string;
  hasActiveFilters: boolean;
  levelFilter: "all" | CEFRLevel;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onLevelChange: (level: "all" | CEFRLevel) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: JourneySortBy) => void;
  onStatusChange: (status: StatusFilter) => void;
  onTargetLangChange: (lang: string) => void;
  searchInput: string;
  sortBy: JourneySortBy;
  statusFilter: StatusFilter;
  t: ReturnType<typeof useTranslation>["t"];
  targetLangFilter: string;
}) {
  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: t("journeys.allStatuses"), value: "all" },
    { label: t("journeys.pinnedBadge"), value: "pinned" },
    { label: t("journeys.inProgressBadge"), value: "in_progress" },
    { label: t("journeys.notStartedBadge"), value: "not_started" },
    { label: t("journeys.completedBadge"), value: "completed" },
  ];

  const sortOptions: { label: string; value: JourneySortBy }[] = [
    { label: t("journeys.sortRecent"), value: "recent" },
    { label: t("journeys.sortProgressHigh"), value: "progress_desc" },
    { label: t("journeys.sortProgressLow"), value: "progress_asc" },
    { label: t("journeys.sortNewest"), value: "newest" },
    { label: "Oldest First", value: "oldest" },
    { label: "CEFR A1 → C2", value: "level_asc" },
    { label: "CEFR C2 → A1", value: "level_desc" },
    { label: t("journeys.sortTitle"), value: "title_asc" },
  ];

  const selectedTargetLang = availableLanguages.find(
    (lang) => lang.code === targetLangFilter
  );
  let targetLangLabel = "All Target Languages";
  if (selectedTargetLang) {
    targetLangLabel = `${getLanguageFlag(selectedTargetLang.code)} ${selectedTargetLang.name}`;
  } else if (targetLangFilter !== "all") {
    targetLangLabel = targetLangFilter.toUpperCase();
  }

  const statusLabel =
    statusOptions.find((option) => option.value === statusFilter)?.label ??
    t("journeys.allStatuses");
  const sortLabel =
    sortOptions.find((option) => option.value === sortBy)?.label ??
    t("journeys.sortRecent");

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="size-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("journeys.searchPlaceholder")}
            aria-label={t("journeys.searchPlaceholder")}
            className="h-9 pl-9 pr-8 bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-500"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={onClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Target Language */}
        <Select
          value={targetLangFilter}
          onValueChange={(v) => onTargetLangChange(v ?? "all")}
        >
          <SelectTrigger
            aria-label="Filter by target language"
            className="w-full h-9 bg-neutral-950 border-neutral-800 text-neutral-100 hover:border-neutral-700 cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Globe className="size-3.5 text-neutral-400 shrink-0" />
              <SelectValue className="truncate">{targetLangLabel}</SelectValue>
            </span>
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
            <SelectItem value="all">All Target Languages</SelectItem>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {getLanguageFlag(lang.code)} {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusChange((v ?? "all") as StatusFilter)}
        >
          <SelectTrigger
            aria-label="Filter by status"
            className="w-full h-9 bg-neutral-950 border-neutral-800 text-neutral-100 hover:border-neutral-700 cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <ListFilter className="size-3.5 text-neutral-400 shrink-0" />
              <SelectValue className="truncate">{statusLabel}</SelectValue>
            </span>
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select
          value={sortBy}
          onValueChange={(v) => onSortChange((v ?? "recent") as JourneySortBy)}
        >
          <SelectTrigger
            aria-label="Sort journeys"
            className="w-full h-9 bg-neutral-950 border-neutral-800 text-neutral-100 hover:border-neutral-700 cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <ArrowUpDown className="size-3.5 text-neutral-400 shrink-0" />
              <SelectValue className="truncate">{sortLabel}</SelectValue>
            </span>
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* CEFR Level Quick Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CEFR_FILTERS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onLevelChange(lvl)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                levelFilter === lvl
                  ? "bg-sky-500 text-white border-sky-400"
                  : "bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white"
              }`}
            >
              {lvl === "all" ? t("journeys.allLevels") : lvl}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-neutral-400 hover:text-white h-7 px-2 cursor-pointer"
          >
            Reset filters
          </Button>
        )}
      </div>
    </section>
  );
}

function JourneysHubPage() {
  const { t } = useTranslation();
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const { availableLanguages, getLanguageFlag } = useLanguagePair();

  const searchParam = searchParams.search ?? "";
  const targetLangFilter = searchParams.lang ?? "all";
  const levelFilter: "all" | CEFRLevel = searchParams.level ?? "all";
  const statusFilter: StatusFilter = searchParams.status ?? "all";
  const sortBy: JourneySortBy = searchParams.sort ?? "recent";

  const [searchInput, setSearchInput] = useState(searchParam);
  const [prevSearchParam, setPrevSearchParam] = useState(searchParam);
  const [journeyToDelete, setJourneyToDelete] =
    useState<JourneyListItem | null>(null);

  if (searchParam !== prevSearchParam) {
    setPrevSearchParam(searchParam);
    setSearchInput(searchParam);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized !== searchParam) {
        navigate({
          replace: true,
          search: (prev) => ({
            ...prev,
            search: normalized || undefined,
          }),
        });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, searchParam, navigate]);

  const {
    data: journeys,
    isLoading,
    error,
  } = useJourneys({
    cefr_level: levelFilter !== "all" ? levelFilter : undefined,
    is_pinned: statusFilter === "pinned" ? true : undefined,
    search: searchParam || undefined,
    sort_by: sortBy,
    status:
      statusFilter !== "all" && statusFilter !== "pinned"
        ? statusFilter
        : undefined,
    target_language_code:
      targetLangFilter !== "all" ? targetLangFilter : undefined,
  });

  const activateJourney = useActivateJourney();
  const togglePin = useToggleJourneyPin();
  const deleteJourney = useDeleteJourney();

  const handleOpenJourney = async (journey: JourneyListItem) => {
    try {
      await activateJourney.mutateAsync(journey.id);
    } catch {
      // Non-blocking: still allow navigation even if touch-last-accessed fails
    }
    navigate({
      params: { journeyId: String(journey.id) },
      to: "/journeys/$journeyId",
    });
  };

  const handleConfirmDelete = async () => {
    if (!journeyToDelete) {
      return;
    }
    try {
      await deleteJourney.mutateAsync(journeyToDelete.id);
      toast.success(`Deleted "${journeyToDelete.title}"`);
      setJourneyToDelete(null);
    } catch {
      toast.error("Could not delete journey.");
    }
  };

  const hasActiveFilters =
    Boolean(searchParam) ||
    targetLangFilter !== "all" ||
    levelFilter !== "all" ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearchInput("");
    navigate({
      replace: true,
      search: (prev) => ({
        sort: prev.sort,
      }),
    });
  };

  const renderJourneysContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {["sk1", "sk2", "sk3"].map((k) => (
            <Skeleton
              key={k}
              className="h-64 rounded-2xl bg-neutral-900 border border-neutral-800"
            />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-sm text-rose-200">
          Could not load learning journeys. Please check your connection and try
          again.
        </div>
      );
    }

    if (!journeys || journeys.length === 0) {
      return (
        <JourneysEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          emptyTitle={t("journeys.emptyTitle")}
          emptyDesc={t("journeys.emptyDesc")}
          newJourneyLabel={t("journeys.newJourneyBtn")}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {journeys.map((journey) => {
          const targetCode =
            journey.language_pair?.target_language.code ?? "de";
          const originCode =
            journey.language_pair?.origin_language.code ?? "en";

          return (
            <Card
              key={journey.id}
              className={`border bg-neutral-900/80 text-neutral-100 rounded-2xl flex flex-col justify-between transition-all hover:border-neutral-700 ${
                journey.is_pinned ? "border-amber-500/40" : "border-neutral-800"
              }`}
            >
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-bold ${LEVEL_BADGE_CLASSES[journey.cefr_level]}`}
                    >
                      {journey.cefr_level}
                    </Badge>
                    {journey.language_pair && (
                      <Badge
                        variant="outline"
                        className="border-neutral-700 bg-neutral-950 text-neutral-200 text-[11px]"
                      >
                        {getLanguageFlag(originCode)} →{" "}
                        {getLanguageFlag(targetCode)}{" "}
                        {journey.language_pair.target_language.name}
                      </Badge>
                    )}
                    {journey.status === "completed" && (
                      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[11px] gap-1">
                        <CheckCircle2 className="size-3" />
                        {t("journeys.completedBadge")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={
                        journey.is_pinned ? "Unpin journey" : "Pin journey"
                      }
                      onClick={() => togglePin.mutate(journey.id)}
                      className={`size-8 rounded-lg cursor-pointer ${
                        journey.is_pinned
                          ? "text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                          : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                      }`}
                    >
                      {journey.is_pinned ? (
                        <Pin className="size-4" />
                      ) : (
                        <PinOff className="size-4" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${journey.title}`}
                      onClick={() => setJourneyToDelete(journey)}
                      className="size-8 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold text-white leading-snug line-clamp-2">
                    {journey.title}
                  </CardTitle>
                  {journey.sector_tag && (
                    <div className="flex items-center gap-1.5 text-xs text-sky-300 font-medium">
                      <Bookmark className="size-3" />
                      <span>{journey.sector_tag}</span>
                    </div>
                  )}
                  {journey.summary && (
                    <CardDescription className="text-xs text-neutral-400 line-clamp-2 pt-0.5">
                      {journey.summary}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">
                      {journey.completed_steps}/{journey.total_steps} steps
                    </span>
                    <span className="font-bold text-white">
                      {Math.round(journey.progress_percentage)}%
                    </span>
                  </div>
                  <Progress
                    value={journey.progress_percentage}
                    className="h-1.5 bg-neutral-800"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>
                    {journey.mastered_vocab_count}/{journey.total_vocab_count}{" "}
                    vocab mastered
                  </span>
                  {journey.next_step_title && (
                    <span className="truncate max-w-[160px] text-neutral-300">
                      Next: {journey.next_step_title}
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="border-neutral-800/80 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    handleOpenJourney(journey);
                  }}
                  disabled={activateJourney.isPending}
                  className="w-full bg-neutral-800 hover:bg-sky-500 text-white font-semibold gap-2 rounded-xl transition-colors cursor-pointer"
                >
                  <span>{t("journeys.continueBtn")}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Header */}
        <section className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-sky-950/30 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
              <Compass className="size-3.5" />
              <span>Goal-Driven Structured Curriculum</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {t("journeys.hubTitle")}
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {t("journeys.hubSubtitle")}
            </p>
          </div>

          <LearningJourneyModal
            trigger={
              <Button className="bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2 px-5 h-11 rounded-xl shadow-lg shadow-sky-500/20 shrink-0 cursor-pointer">
                <Plus className="size-4" />
                <span>{t("journeys.newJourneyBtn")}</span>
              </Button>
            }
          />
        </section>

        {/* Filter & Sort Controls */}
        <JourneysFilterBar
          availableLanguages={availableLanguages}
          getLanguageFlag={getLanguageFlag}
          hasActiveFilters={hasActiveFilters}
          levelFilter={levelFilter}
          onClearFilters={clearFilters}
          onClearSearch={() => {
            setSearchInput("");
            navigate({
              replace: true,
              search: (prev) => ({
                ...prev,
                search: undefined,
              }),
            });
          }}
          onLevelChange={(lvl) =>
            navigate({
              replace: true,
              search: (prev) => ({
                ...prev,
                level: lvl === "all" ? undefined : lvl,
              }),
            })
          }
          onSearchChange={setSearchInput}
          onSortChange={(nextSort) =>
            navigate({
              replace: true,
              search: (prev) => ({
                ...prev,
                sort: nextSort === "recent" ? undefined : nextSort,
              }),
            })
          }
          onStatusChange={(nextStatus) =>
            navigate({
              replace: true,
              search: (prev) => ({
                ...prev,
                status: nextStatus === "all" ? undefined : nextStatus,
              }),
            })
          }
          onTargetLangChange={(nextLang) =>
            navigate({
              replace: true,
              search: (prev) => ({
                ...prev,
                lang: nextLang === "all" ? undefined : nextLang,
              }),
            })
          }
          searchInput={searchInput}
          sortBy={sortBy}
          statusFilter={statusFilter}
          t={t}
          targetLangFilter={targetLangFilter}
        />

        {renderJourneysContent()}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(journeyToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setJourneyToDelete(null);
          }
        }}
      >
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Delete Learning Journey?
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              This will permanently remove{" "}
              <strong className="text-white">{journeyToDelete?.title}</strong>{" "}
              and its progress steps. Any flashcards you already saved will stay
              in your Flashcards deck.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setJourneyToDelete(null)}
              className="border-neutral-700 text-neutral-200 hover:bg-neutral-800 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                handleConfirmDelete();
              }}
              disabled={deleteJourney.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              {deleteJourney.isPending ? "Deleting..." : "Delete Journey"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
