import { Button } from "@linguamaxima/ui/components/button";
import { Input } from "@linguamaxima/ui/components/input";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Check,
  Globe,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { GenerateStoryDialog } from "../components/generate-story-dialog";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import { useCreateLanguagePair, useStories } from "../lib/queries";
import type { Language } from "../types/api";

const PRESETS = [
  { origin: "id", target: "de" },
  { origin: "en", target: "de" },
  { origin: "en", target: "es" },
  { origin: "en", target: "fr" },
  { origin: "id", target: "ja" },
  { origin: "id", target: "en" },
] as const;

export const Route = createFileRoute("/languages")({
  component: LanguagesPageComponent,
});

function LanguagesPageComponent() {
  const { t } = useTranslation();
  const {
    availableLanguages,
    getLanguageFlag,
    originLanguage,
    setLanguagePair,
    targetLanguage,
  } = useLanguagePair();

  const [selectedOrigin, setSelectedOrigin] =
    useState<Language>(originLanguage);
  const [selectedTarget, setSelectedTarget] =
    useState<Language>(targetLanguage);
  const [search, setSearch] = useState("");

  const createPairMutation = useCreateLanguagePair();

  // Accurate story count query for the currently selected pair
  const { data: targetStories } = useStories({
    origin_language_code: selectedOrigin.code,
    target_language_code: selectedTarget.code,
  });

  const isSameLanguage = selectedOrigin.code === selectedTarget.code;
  const isCurrentActive =
    originLanguage.code === selectedOrigin.code &&
    targetLanguage.code === selectedTarget.code;

  const filteredLanguages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return availableLanguages;
    }
    return availableLanguages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        (lang.native_name && lang.native_name.toLowerCase().includes(query)) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [availableLanguages, search]);

  const handleSwap = () => {
    const prevOrigin = selectedOrigin;
    setSelectedOrigin(selectedTarget);
    setSelectedTarget(prevOrigin);
  };

  const handleReset = () => {
    setSelectedOrigin(originLanguage);
    setSelectedTarget(targetLanguage);
    toast.info("Reset selections to active language pair.");
  };

  const handleApply = () => {
    if (isSameLanguage) {
      toast.error(t("languages.sameLanguageError"));
      return;
    }
    setLanguagePair(selectedOrigin, selectedTarget);
    createPairMutation.mutate(
      {
        origin_language_code: selectedOrigin.code,
        target_language_code: selectedTarget.code,
      },
      {
        onSuccess: () => {
          toast.success(
            t("languages.toastSuccess", {
              origin: selectedOrigin.name,
              target: selectedTarget.name,
            })
          );
        },
      }
    );
  };

  const handleSelectPreset = (originCode: string, targetCode: string) => {
    const origin = availableLanguages.find((l) => l.code === originCode);
    const target = availableLanguages.find((l) => l.code === targetCode);
    if (origin && target) {
      setSelectedOrigin(origin);
      setSelectedTarget(target);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-10 pb-28">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <Globe className="size-3.5" />
            <span>{t("languages.badge")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t("languages.title")}
          </h1>
          <p className="text-sm text-neutral-400">{t("languages.subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/">
            <Button
              variant="outline"
              className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 gap-2 text-xs"
            >
              <BookOpen className="size-4" />
              {t("languages.viewStories")}
            </Button>
          </Link>
          <GenerateStoryDialog />
        </div>
      </div>

      {/* Popular Presets Quick Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Popular Learning Pairs</span>
          </span>
          <span className="text-xs text-neutral-500">Quick 1-click switch</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {PRESETS.map((p) => {
            const isPresetSelected =
              selectedOrigin.code === p.origin &&
              selectedTarget.code === p.target;
            const orig = availableLanguages.find((l) => l.code === p.origin);
            const targ = availableLanguages.find((l) => l.code === p.target);
            const label =
              orig && targ
                ? `${orig.name} → ${targ.name}`
                : `${p.origin.toUpperCase()} → ${p.target.toUpperCase()}`;

            return (
              <button
                key={`${p.origin}_${p.target}`}
                type="button"
                onClick={() => handleSelectPreset(p.origin, p.target)}
                aria-pressed={isPresetSelected}
                className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all flex items-center gap-1.5 ${
                  isPresetSelected
                    ? "bg-sky-500/20 border-sky-500 text-white shadow-sm ring-1 ring-sky-500"
                    : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                }`}
              >
                <span aria-hidden="true">{getLanguageFlag(p.target)}</span>
                <span>{label}</span>
                {isPresetSelected && (
                  <Check className="size-3 text-sky-400 ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Pair Configurator Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-950/40 via-neutral-900 to-neutral-950 border border-neutral-800/90 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Zap className="size-3.5" />
            <span>{t("languages.activePairTitle")}</span>
          </span>
          {isCurrentActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Check className="size-3.5" />
              {t("languages.activeBadge")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              {t("languages.unsavedChanges")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          {/* Origin Language selector box */}
          <div className="md:col-span-5 p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-2">
            <div className="text-xs uppercase font-bold tracking-wider text-neutral-400">
              {t("languages.iSpeak")}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">
                {getLanguageFlag(selectedOrigin.code)}
              </span>
              <div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {selectedOrigin.name}
                </div>
                <div className="text-xs text-neutral-400">
                  {selectedOrigin.native_name || selectedOrigin.code}
                </div>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={handleSwap}
              title={t("languages.swapTooltip")}
              aria-label="Swap source and target languages"
              className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <ArrowLeftRight className="size-4" />
            </button>
          </div>

          {/* Target Language selector box */}
          <div className="md:col-span-5 p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-2">
            <div className="text-xs uppercase font-bold tracking-wider text-sky-400">
              {t("languages.iLearn")}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">
                {getLanguageFlag(selectedTarget.code)}
              </span>
              <div>
                <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedTarget.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
                    {t("languages.targetBadge")}
                  </span>
                </div>
                <div className="text-xs text-neutral-400">
                  {selectedTarget.native_name || selectedTarget.code}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Warning for Identical Pair */}
        {isSameLanguage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-400 font-medium">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              Source and target languages cannot be identical. Please choose two
              distinct languages.
            </span>
          </div>
        )}

        {/* Action button bar inside card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-neutral-800/80">
          <div className="text-xs text-neutral-400">
            {targetStories && targetStories.length > 0 ? (
              <span>
                {t("languages.storiesCountForPair", {
                  count: targetStories.length,
                })}
              </span>
            ) : (
              <span>{t("languages.noStoriesForPair")}</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              onClick={handleApply}
              disabled={
                isCurrentActive ||
                isSameLanguage ||
                createPairMutation.isPending
              }
              className="flex-1 sm:flex-initial bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-xs gap-2 shadow-lg shadow-sky-500/20"
            >
              {createPairMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  <span>{t("languages.setActivePair")}</span>
                </>
              )}
            </Button>
            <Link to="/">
              <Button
                variant="outline"
                className="border-neutral-700 text-neutral-200 hover:bg-neutral-800 text-xs gap-1.5"
              >
                <span>{t("languages.goToStories")}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Language Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white">
            All Available Languages
          </h2>
          <p className="text-xs text-neutral-400">
            Select an origin tongue and a learning target from the matrices
            below.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search language or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search languages by name or code"
            className="h-9 pl-8 text-xs bg-neutral-900 border-neutral-800 rounded-xl text-neutral-200 placeholder:text-neutral-500 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Language Pickers Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Origin Language Grid */}
        <div className="space-y-4 p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{t("languages.originSectionTitle")}</span>
              </h3>
              <p className="text-xs text-neutral-400">
                {t("languages.originSectionDesc")}
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-medium">
              {filteredLanguages.length} languages
            </span>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1"
            aria-label="Origin language selection"
          >
            {filteredLanguages.map((lang) => {
              const isSelected = selectedOrigin.code === lang.code;
              return (
                <button
                  key={`origin-${lang.code}`}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Origin language: ${lang.name} (${lang.native_name || lang.code})`}
                  onClick={() => setSelectedOrigin(lang)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    isSelected
                      ? "bg-sky-500/20 border-sky-500 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-500"
                      : "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0" aria-hidden="true">
                      {getLanguageFlag(lang.code)}
                    </span>
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-bold text-white truncate">
                        {lang.name}
                      </div>
                      <div className="text-xs text-neutral-400 truncate">
                        {lang.native_name || lang.code}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="size-4 text-sky-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Language Grid */}
        <div className="space-y-4 p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{t("languages.targetSectionTitle")}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
                  {t("languages.cefrBadge")}
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                {t("languages.targetSectionDesc")}
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-medium">
              {filteredLanguages.length} languages
            </span>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1"
            aria-label="Target language selection"
          >
            {filteredLanguages.map((lang) => {
              const isSelected = selectedTarget.code === lang.code;
              return (
                <button
                  key={`target-${lang.code}`}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Target language: ${lang.name} (${lang.native_name || lang.code})`}
                  onClick={() => setSelectedTarget(lang)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    isSelected
                      ? "bg-sky-500/20 border-sky-500 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-500"
                      : "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0" aria-hidden="true">
                      {getLanguageFlag(lang.code)}
                    </span>
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-bold text-white truncate">
                        {lang.name}
                      </div>
                      <div className="text-xs text-neutral-400 truncate">
                        {lang.native_name || lang.code}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="size-4 text-sky-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature Information Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800 space-y-2">
          <div className="size-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Sparkles className="size-4" />
          </div>
          <h4 className="text-sm font-bold text-white">
            {t("languages.card1Title")}
          </h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t("languages.card1Desc")}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800 space-y-2">
          <div className="size-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Globe className="size-4" />
          </div>
          <h4 className="text-sm font-bold text-white">
            {t("languages.card2Title")}
          </h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t("languages.card2Desc")}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800 space-y-2">
          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <BookOpen className="size-4" />
          </div>
          <h4 className="text-sm font-bold text-white">
            {t("languages.card3Title")}
          </h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t("languages.card3Desc")}
          </p>
        </div>
      </div>

      {/* Floating Sticky Bottom Commit Bar when changes are pending */}
      {!isCurrentActive && (
        <div className="fixed bottom-4 inset-x-0 z-40 px-4 flex justify-center animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div className="pointer-events-auto max-w-2xl w-full p-4 rounded-2xl bg-neutral-950/95 border border-sky-500/50 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 ring-1 ring-sky-500/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="size-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="text-xs text-neutral-300 truncate">
                <span className="font-semibold text-white">Unsaved pair:</span>{" "}
                <span className="font-medium text-neutral-200">
                  {selectedOrigin.name} ({getLanguageFlag(selectedOrigin.code)})
                </span>{" "}
                <span className="text-sky-400 font-bold">→</span>{" "}
                <span className="font-medium text-white">
                  {selectedTarget.name} ({getLanguageFlag(selectedTarget.code)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-8 border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs px-2.5 gap-1.5"
              >
                <RotateCcw className="size-3" />
                <span>Reset</span>
              </Button>
              <Button
                type="button"
                onClick={handleApply}
                disabled={isSameLanguage || createPairMutation.isPending}
                className="h-8 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs px-4 gap-1.5 shadow-md shadow-sky-500/20"
              >
                {createPairMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Apply Active Pair</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
