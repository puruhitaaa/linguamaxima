import { Button } from "@linguamaxima/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@linguamaxima/ui/components/dialog";
import { Input } from "@linguamaxima/ui/components/input";
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  Globe,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import { useCreateLanguagePair } from "../lib/queries";
import type { Language } from "../types/api";

const PRESETS = [
  { origin: "id", target: "de" },
  { origin: "en", target: "de" },
  { origin: "en", target: "es" },
  { origin: "en", target: "fr" },
  { origin: "id", target: "ja" },
  { origin: "id", target: "en" },
] as const;

export function LanguagePairModal({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
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
  const [activeTab, setActiveTab] = useState<"origin" | "target">("target");
  const [search, setSearch] = useState("");

  const isSameLanguage = selectedOrigin.code === selectedTarget.code;

  const createPairMutation = useCreateLanguagePair();

  // Keep synced when opened
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedOrigin(originLanguage);
      setSelectedTarget(targetLanguage);
      setSearch("");
      setActiveTab("target");
    }
    onOpenChange(nextOpen);
  };

  const filteredLanguages = availableLanguages.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.native_name &&
        l.native_name.toLowerCase().includes(search.toLowerCase())) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSwap = () => {
    const prevOrigin = selectedOrigin;
    setSelectedOrigin(selectedTarget);
    setSelectedTarget(prevOrigin);
  };

  const handleApply = () => {
    if (isSameLanguage) {
      toast.error(t("modal.sameLanguageError"));
      return;
    }
    setLanguagePair(selectedOrigin, selectedTarget);
    createPairMutation.mutate({
      origin_language_code: selectedOrigin.code,
      target_language_code: selectedTarget.code,
    });
    toast.success(
      t("modal.toastSuccess", {
        origin: selectedOrigin.name,
        target: selectedTarget.name,
      })
    );
    onOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl bg-neutral-950 border-neutral-800 text-neutral-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Globe className="size-5 text-sky-400" />
            {t("modal.dialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-neutral-400 text-xs">
            {t("modal.dialogDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Current Pair Selection Showcase */}
        <div
          className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 my-2"
          role="tablist"
          aria-label="Language pair selection tabs"
        >
          {/* Origin Language Box */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "origin"}
            onClick={() => setActiveTab("origin")}
            className={`flex-1 min-w-0 text-left p-2 sm:p-3 rounded-xl border transition-all ${
              activeTab === "origin"
                ? "bg-neutral-800 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500"
                : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
            }`}
          >
            <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-neutral-400 block mb-1">
              {t("modal.iSpeak")}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="text-xl sm:text-2xl shrink-0">
                {getLanguageFlag(selectedOrigin.code)}
              </span>
              <div className="min-w-0 truncate">
                <div className="font-bold text-xs sm:text-sm text-white truncate">
                  {selectedOrigin.name}
                </div>
                <div className="text-[11px] sm:text-xs text-neutral-400 truncate">
                  {selectedOrigin.native_name || selectedOrigin.code}
                </div>
              </div>
            </div>
          </button>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwap}
            title={t("modal.swapTooltip")}
            aria-label="Swap native and target languages"
            className="p-2 sm:p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white transition-all transform hover:scale-105 active:scale-95 shrink-0"
          >
            <ArrowLeftRight className="size-3.5 sm:size-4" />
          </button>

          {/* Target Language Box */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "target"}
            onClick={() => setActiveTab("target")}
            className={`flex-1 min-w-0 text-left p-2 sm:p-3 rounded-xl border transition-all ${
              activeTab === "target"
                ? "bg-neutral-800 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500"
                : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
            }`}
          >
            <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-neutral-400 block mb-1">
              {t("modal.iLearn")}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="text-xl sm:text-2xl shrink-0">
                {getLanguageFlag(selectedTarget.code)}
              </span>
              <div className="min-w-0 truncate">
                <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1 min-w-0">
                  <span className="truncate">{selectedTarget.name}</span>
                  <span className="hidden sm:inline-block text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold shrink-0">
                    {t("modal.targetBadge")}
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-neutral-400 truncate">
                  {selectedTarget.native_name || selectedTarget.code}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Validation Warning for Identical Pair */}
        {isSameLanguage && (
          <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium px-1">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>Source and target languages cannot be identical.</span>
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
            <Sparkles className="size-3 text-amber-400" />
            {t("modal.popularPresets")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const isCurrent =
                selectedOrigin.code === p.origin &&
                selectedTarget.code === p.target;
              const orig = availableLanguages.find((l) => l.code === p.origin);
              const targ = availableLanguages.find((l) => l.code === p.target);
              const label =
                orig && targ
                  ? t("modal.presetItem", {
                      origin: orig.name,
                      target: targ.name,
                    })
                  : `${p.origin.toUpperCase()} → ${p.target.toUpperCase()}`;

              return (
                <button
                  key={`${p.origin}_${p.target}`}
                  type="button"
                  onClick={() => handleSelectPreset(p.origin, p.target)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                    isCurrent
                      ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  {getLanguageFlag(p.target)} {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection Grid with Search */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-neutral-300">
              {activeTab === "origin"
                ? t("modal.selectOriginTitle")
                : t("modal.selectTargetTitle")}
            </span>
            <div className="relative w-36 sm:w-44 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-500" />
              <Input
                type="text"
                placeholder={t("modal.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t("modal.searchPlaceholder")}
                className="h-8 pl-8 text-xs bg-neutral-900 border-neutral-800 rounded-lg text-neutral-200 placeholder:text-neutral-500"
              />
            </div>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1"
            aria-label="Available languages"
          >
            {filteredLanguages.map((lang) => {
              const isSelected =
                activeTab === "origin"
                  ? selectedOrigin.code === lang.code
                  : selectedTarget.code === lang.code;

              return (
                <button
                  key={lang.code}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (activeTab === "origin") {
                      setSelectedOrigin(lang);
                      setActiveTab("target");
                    } else {
                      setSelectedTarget(lang);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-sky-500/15 border-sky-500 text-white shadow-sm"
                      : "bg-neutral-900/60 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-lg">
                      {getLanguageFlag(lang.code)}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">
                        {lang.name}
                      </div>
                      <div className="text-xs text-neutral-400 truncate">
                        {lang.native_name}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="size-3.5 text-sky-400 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2.5 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs"
          >
            {t("modal.cancelBtn")}
          </Button>
          <Button
            type="button"
            disabled={isSameLanguage || createPairMutation.isPending}
            onClick={handleApply}
            className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-xs gap-1.5 shadow-md shadow-sky-500/20"
          >
            <Check className="size-4" />
            {t("modal.applyBtn", { target: selectedTarget.name })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
