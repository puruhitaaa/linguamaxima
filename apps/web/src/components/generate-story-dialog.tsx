import { Button } from "@linguamaxima/ui/components/button";
import { Checkbox } from "@linguamaxima/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@linguamaxima/ui/components/dialog";
import { Input } from "@linguamaxima/ui/components/input";
import { Label } from "@linguamaxima/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@linguamaxima/ui/components/select";
import {
  AlertCircle,
  ArrowLeftRight,
  BookOpen,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "../lib/i18n";
import type { TranslationKey } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import { useGenerateStory } from "../lib/queries";
import type { CEFRLevel } from "../types/api";

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const CATEGORY_SLUGS = [
  "travel",
  "food",
  "culture",
  "daily-life",
  "technology",
  "science",
  "entertainment",
  "news",
  "history",
  "nature",
] as const;

const GENERATION_STEP_KEYS: TranslationKey[] = [
  "generator.stepDrafting",
  "generator.stepSynthesizing",
  "generator.stepExtracting",
  "generator.stepComposing",
];

export function GenerateStoryDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const { t, tCategory } = useTranslation();
  const {
    availableLanguages,
    getLanguageFlag,
    originLanguage,
    setLanguagePair,
    targetLanguage,
  } = useLanguagePair();

  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [category, setCategory] = useState("travel");
  const [storyType, setStoryType] = useState<
    "auto" | "dialogue" | "monologue" | "informative"
  >("auto");
  const [topicHint, setTopicHint] = useState("");
  const [originCode, setOriginCode] = useState(originLanguage.code);
  const [targetCode, setTargetCode] = useState(targetLanguage.code);
  const [syncActivePair, setSyncActivePair] = useState(true);
  const [generationStep, setGenerationStep] = useState(0);

  const isSameLanguage = originCode === targetCode;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOriginCode(originLanguage.code);
      setTargetCode(targetLanguage.code);
      setGenerationStep(0);
    }
    setOpen(nextOpen);
  };

  const generateMutation = useGenerateStory();

  useEffect(() => {
    if (!generateMutation.isPending) {
      return;
    }

    const interval = setInterval(() => {
      setGenerationStep((prev) => (prev + 1) % GENERATION_STEP_KEYS.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [generateMutation.isPending]);

  const handleSwap = () => {
    const prevOrigin = originCode;
    setOriginCode(targetCode);
    setTargetCode(prevOrigin);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSameLanguage) {
      return;
    }

    try {
      if (
        syncActivePair &&
        (originCode !== originLanguage.code ||
          targetCode !== targetLanguage.code)
      ) {
        setLanguagePair(originCode, targetCode);
      }

      await generateMutation.mutateAsync({
        category_slug: category,
        cefr_level: level,
        origin_language_code: originCode,
        story_type: storyType,
        target_language_code: targetCode,
        topic_hint: topicHint.trim() || undefined,
      });
      setOpen(false);
      setTopicHint("");
    } catch {
      // Error toast is handled by mutation onError
    }
  };

  const activeTargetLang =
    availableLanguages.find((l) => l.code === targetCode) || targetLanguage;
  const activeOriginLang =
    availableLanguages.find((l) => l.code === originCode) || originLanguage;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button
              className="gap-1.5 sm:gap-2 bg-sky-500 hover:bg-sky-600 text-white shadow-sm font-semibold px-2.5 sm:px-3.5 lg:px-4 min-h-[36px] shrink-0"
              aria-label={t("generator.triggerBtn")}
            >
              <Sparkles className="size-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">
                {t("generator.triggerBtn")}
              </span>
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto sm:max-w-lg bg-neutral-950 text-neutral-100 border-neutral-800 p-4 sm:p-6 w-[calc(100%-1.5rem)] sm:w-full rounded-2xl sm:rounded-3xl">
        <form onSubmit={handleGenerate}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-sky-400 shrink-0" />
              {t("generator.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs leading-relaxed">
              {t("generator.dialogDesc", {
                origin: activeOriginLang.name,
                target: activeTargetLang.name,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:gap-5 py-3 sm:py-4">
            {/* Language Pair Selectors in Generator */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2.5">
              <div className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-neutral-400">
                {t("generator.languageDirection")}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <Label className="text-[11px] sm:text-xs text-neutral-400 block font-medium truncate">
                    {t("generator.iSpeakLabel")}
                  </Label>
                  <Select
                    value={originCode}
                    onValueChange={(val) => val && setOriginCode(val)}
                  >
                    <SelectTrigger className="w-full h-9 bg-neutral-950 border-neutral-700 text-xs text-neutral-200 focus:ring-sky-500 font-medium rounded-xl px-2.5 sm:px-3">
                      <SelectValue
                        placeholder={t("generator.selectLanguagePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-950 border-neutral-800 text-neutral-200">
                      {availableLanguages.map((l) => (
                        <SelectItem key={`dlg-orig-${l.code}`} value={l.code}>
                          <span>{getLanguageFlag(l.code)}</span>
                          <span>{l.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="shrink-0 pt-4 sm:pt-5">
                  <button
                    type="button"
                    onClick={handleSwap}
                    title={t("generator.swapTooltip")}
                    aria-label="Swap source and target languages"
                    className="p-1.5 sm:p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition-colors"
                  >
                    <ArrowLeftRight className="size-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <Label className="text-[11px] sm:text-xs text-sky-400 block font-bold truncate">
                    {t("generator.iLearnLabel")}
                  </Label>
                  <Select
                    value={targetCode}
                    onValueChange={(val) => val && setTargetCode(val)}
                  >
                    <SelectTrigger className="w-full h-9 bg-neutral-950 border-sky-500/50 text-xs text-white focus:ring-sky-500 font-bold rounded-xl px-2.5 sm:px-3">
                      <SelectValue
                        placeholder={t("generator.selectLanguagePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-950 border-neutral-800 text-neutral-200">
                      {availableLanguages.map((l) => (
                        <SelectItem key={`dlg-targ-${l.code}`} value={l.code}>
                          <span>{getLanguageFlag(l.code)}</span>
                          <span>{l.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Validation Warning for Identical Pair */}
              {isSameLanguage && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium pt-0.5">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{t("modal.sameLanguageError")}</span>
                </div>
              )}

              {/* Sync with Active Pair Checkbox */}
              <div className="flex items-center gap-2 pt-0.5">
                <Checkbox
                  id="sync-active-pair"
                  checked={syncActivePair}
                  onCheckedChange={(checked) =>
                    setSyncActivePair(Boolean(checked))
                  }
                  className="data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500 shrink-0"
                />
                <Label
                  htmlFor="sync-active-pair"
                  className="text-xs text-neutral-400 cursor-pointer font-normal leading-tight"
                >
                  {t("generator.syncActivePairLabel")}
                </Label>
              </div>
            </div>

            {/* CEFR Level */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                {t("generator.cefrLabel")}
              </Label>
              <div
                className="grid grid-cols-6 gap-1 sm:gap-1.5"
                aria-label="CEFR Proficiency Level"
              >
                {CEFR_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    aria-pressed={level === lvl}
                    onClick={() => setLevel(lvl)}
                    className={`py-2 text-xs font-semibold rounded-xl transition-colors border text-center flex items-center justify-center ${
                      level === lvl
                        ? "bg-sky-500 border-sky-400 text-white shadow-sm"
                        : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Story Format / Type */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                {t("generator.storyTypeLabel")}
              </Label>
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-1.5"
                aria-label={t("generator.storyTypeLabel")}
              >
                <button
                  type="button"
                  aria-pressed={storyType === "auto"}
                  onClick={() => setStoryType("auto")}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl transition-colors border flex items-center justify-center gap-1.5 min-w-0 ${
                    storyType === "auto"
                      ? "bg-sky-500 border-sky-400 text-white shadow-sm"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  <Sparkles className="size-3.5 shrink-0" />
                  <span className="truncate">Auto</span>
                </button>
                <button
                  type="button"
                  aria-pressed={storyType === "dialogue"}
                  onClick={() => setStoryType("dialogue")}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl transition-colors border flex items-center justify-center gap-1.5 min-w-0 ${
                    storyType === "dialogue"
                      ? "bg-sky-500 border-sky-400 text-white shadow-sm"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  <MessageSquare className="size-3.5 shrink-0" />
                  <span className="truncate">Dialogue (2+)</span>
                </button>
                <button
                  type="button"
                  aria-pressed={storyType === "monologue"}
                  onClick={() => setStoryType("monologue")}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl transition-colors border flex items-center justify-center gap-1.5 min-w-0 ${
                    storyType === "monologue"
                      ? "bg-sky-500 border-sky-400 text-white shadow-sm"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  <BookOpen className="size-3.5 shrink-0" />
                  <span className="truncate">Monologue</span>
                </button>
                <button
                  type="button"
                  aria-pressed={storyType === "informative"}
                  onClick={() => setStoryType("informative")}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl transition-colors border flex items-center justify-center gap-1.5 min-w-0 ${
                    storyType === "informative"
                      ? "bg-sky-500 border-sky-400 text-white shadow-sm"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  <FileText className="size-3.5 shrink-0" />
                  <span className="truncate">Informative</span>
                </button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                {t("generator.categoryLabel")}
              </Label>
              <Select
                value={category}
                onValueChange={(val) => val && setCategory(val)}
              >
                <SelectTrigger className="w-full h-9 sm:h-10 bg-neutral-900 border-neutral-800 text-xs text-neutral-200 focus:ring-sky-500 rounded-xl px-2.5 sm:px-3">
                  <SelectValue
                    placeholder={t("generator.selectCategoryPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent className="bg-neutral-950 border-neutral-800 text-neutral-200">
                  {CATEGORY_SLUGS.map((slug) => (
                    <SelectItem key={slug} value={slug}>
                      {tCategory(slug)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic Hint */}
            <div className="space-y-2">
              <Label
                htmlFor="generator-topic-hint"
                className="text-xs uppercase tracking-wider text-neutral-400"
              >
                {t("generator.topicHintLabel")}
              </Label>
              <Input
                id="generator-topic-hint"
                placeholder={t("generator.topicHintPlaceholder")}
                value={topicHint}
                onChange={(e) => setTopicHint(e.target.value)}
                className="bg-neutral-900 border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-500 rounded-xl h-9 sm:h-10 px-2.5 sm:px-3"
              />
            </div>

            {/* Progress Stepper Banner during generation */}
            {generateMutation.isPending && (
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
                  <Loader2 className="size-4 animate-spin shrink-0" />
                  <span>{t(GENERATION_STEP_KEYS[generationStep])}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {GENERATION_STEP_KEYS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        idx <= generationStep
                          ? "bg-sky-500 shadow-sm shadow-sky-500/50"
                          : "bg-neutral-800"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={generateMutation.isPending}
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs h-9 sm:h-10"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending || isSameLanguage}
              className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white gap-2 font-semibold text-xs shadow-md shadow-sky-500/20 h-9 sm:h-10"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>
                    {t("generator.generatingBtn", {
                      target: activeTargetLang.name,
                    })}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>
                    {t("generator.generateBtn", {
                      target: activeTargetLang.name,
                    })}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
