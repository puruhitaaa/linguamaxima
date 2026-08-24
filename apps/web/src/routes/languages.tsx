import { Button } from "@linguamaxima/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Check,
  Globe,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GenerateStoryDialog } from "../components/generate-story-dialog";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import { useCreateLanguagePair, useStories } from "../lib/queries";
import type { Language } from "../types/api";

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

  const createPairMutation = useCreateLanguagePair();

  const { data: targetStories } = useStories({
    limit: 5,
    origin_language_code: selectedOrigin.code,
    target_language_code: selectedTarget.code,
  });

  const handleSwap = () => {
    const prevOrigin = selectedOrigin;
    setSelectedOrigin(selectedTarget);
    setSelectedTarget(prevOrigin);
  };

  const handleApply = () => {
    if (selectedOrigin.code === selectedTarget.code) {
      toast.error(t("languages.sameLanguageError"));
      return;
    }
    setLanguagePair(selectedOrigin, selectedTarget);
    createPairMutation.mutate({
      origin_language_code: selectedOrigin.code,
      target_language_code: selectedTarget.code,
    });
    toast.success(
      t("languages.toastSuccess", {
        origin: selectedOrigin.name,
        target: selectedTarget.name,
      })
    );
  };

  const isCurrentActive =
    originLanguage.code === selectedOrigin.code &&
    targetLanguage.code === selectedTarget.code;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-10">
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

      {/* Active Pair Configurator Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-950/40 via-neutral-900 to-neutral-950 border border-neutral-800/90 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
            {t("languages.activePairTitle")}
          </span>
          {isCurrentActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Check className="size-3.5" />
              {t("languages.activeBadge")}
            </span>
          ) : (
            <span className="text-xs text-amber-400 font-semibold">
              {t("languages.unsavedChanges")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          {/* Origin Language selector box */}
          <div className="md:col-span-5 p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-2">
            <div className="text-[11px] uppercase font-bold tracking-wider text-neutral-400">
              {t("languages.iSpeak")}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {getLanguageFlag(selectedOrigin.code)}
              </span>
              <div>
                <div className="text-lg font-bold text-white">
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
              className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-md"
            >
              <ArrowLeftRight className="size-4" />
            </button>
          </div>

          {/* Target Language selector box */}
          <div className="md:col-span-5 p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-2">
            <div className="text-[11px] uppercase font-bold tracking-wider text-sky-400">
              {t("languages.iLearn")}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {getLanguageFlag(selectedTarget.code)}
              </span>
              <div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedTarget.name}
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
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

        {/* Action button */}
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
              disabled={isCurrentActive}
              className="flex-1 sm:flex-initial bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs gap-2 shadow-lg shadow-sky-500/20"
            >
              <Check className="size-4" />
              <span>{t("languages.setActivePair")}</span>
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

      {/* Language Pickers Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Origin Language Grid */}
        <div className="space-y-4 p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t("languages.originSectionTitle")}</span>
              </h2>
              <p className="text-xs text-neutral-400">
                {t("languages.originSectionDesc")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {availableLanguages.map((lang) => {
              const isSelected = selectedOrigin.code === lang.code;
              return (
                <button
                  key={`origin-${lang.code}`}
                  type="button"
                  onClick={() => setSelectedOrigin(lang)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "bg-sky-500/20 border-sky-500 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-500"
                      : "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">
                      {getLanguageFlag(lang.code)}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {lang.name}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {lang.native_name}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="size-4 text-sky-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Language Grid */}
        <div className="space-y-4 p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t("languages.targetSectionTitle")}</span>
                <span className="text-[10px] px-2 py-0.2 rounded bg-sky-500/20 text-sky-400 font-bold">
                  {t("languages.cefrBadge")}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {t("languages.targetSectionDesc")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {availableLanguages.map((lang) => {
              const isSelected = selectedTarget.code === lang.code;
              return (
                <button
                  key={`target-${lang.code}`}
                  type="button"
                  onClick={() => setSelectedTarget(lang)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "bg-sky-500/20 border-sky-500 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-500"
                      : "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">
                      {getLanguageFlag(lang.code)}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {lang.name}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {lang.native_name}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="size-4 text-sky-400" />}
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
          <h3 className="text-sm font-bold text-white">
            {t("languages.card1Title")}
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t("languages.card1Desc")}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800 space-y-2">
          <div className="size-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Globe className="size-4" />
          </div>
          <h3 className="text-sm font-bold text-white">
            {t("languages.card2Title")}
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t("languages.card2Desc")}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800 space-y-2">
          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <BookOpen className="size-4" />
          </div>
          <h3 className="text-sm font-bold text-white">
            {t("languages.card3Title")}
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t("languages.card3Desc")}
          </p>
        </div>
      </div>
    </div>
  );
}
