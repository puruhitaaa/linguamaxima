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
import { AlertCircle, ArrowLeftRight, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "../lib/i18n";
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

const GENERATION_STEPS = [
  "Drafting engaging story narrative...",
  "Synthesizing parallel bilingual translation...",
  "Extracting CEFR vocabulary and grammar terms...",
  "Composing interactive reading quiz...",
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
      setGenerationStep((prev) => (prev + 1) % GENERATION_STEPS.length);
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
            <Button className="gap-2 bg-sky-500 hover:bg-sky-600 text-white shadow-sm font-semibold">
              <Sparkles className="size-4" />
              <span>{t("generator.triggerBtn")}</span>
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg bg-neutral-950 text-neutral-100 border-neutral-800 p-6">
        <form onSubmit={handleGenerate}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-sky-400" />
              {t("generator.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs leading-relaxed">
              {t("generator.dialogDesc", {
                origin: activeOriginLang.name,
                target: activeTargetLang.name,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Language Pair Selectors in Generator */}
            <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
              <div className="text-xs uppercase font-bold tracking-wider text-neutral-400">
                {t("generator.languageDirection")}
              </div>
              <div className="grid grid-cols-11 gap-2 items-center">
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs text-neutral-400 block font-medium">
                    {t("generator.iSpeakLabel")}
                  </Label>
                  <Select
                    value={originCode}
                    onValueChange={(val) => val && setOriginCode(val)}
                  >
                    <SelectTrigger className="w-full h-9 bg-neutral-950 border-neutral-700 text-xs text-neutral-200 focus:ring-sky-500 font-medium rounded-xl">
                      <SelectValue placeholder="Select language" />
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

                <div className="col-span-1 flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={handleSwap}
                    title={t("generator.swapTooltip")}
                    aria-label="Swap source and target languages"
                    className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition-colors"
                  >
                    <ArrowLeftRight className="size-3.5" />
                  </button>
                </div>

                <div className="col-span-5 space-y-1">
                  <Label className="text-xs text-sky-400 block font-bold">
                    {t("generator.iLearnLabel")}
                  </Label>
                  <Select
                    value={targetCode}
                    onValueChange={(val) => val && setTargetCode(val)}
                  >
                    <SelectTrigger className="w-full h-9 bg-neutral-950 border-sky-500/50 text-xs text-white focus:ring-sky-500 font-bold rounded-xl">
                      <SelectValue placeholder="Select language" />
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
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium pt-1">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>Source and target languages cannot be identical.</span>
                </div>
              )}

              {/* Sync with Active Pair Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="sync-active-pair"
                  checked={syncActivePair}
                  onCheckedChange={(checked) =>
                    setSyncActivePair(Boolean(checked))
                  }
                  className="data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                />
                <Label
                  htmlFor="sync-active-pair"
                  className="text-xs text-neutral-400 cursor-pointer font-normal"
                >
                  Set as active learning pair for the app
                </Label>
              </div>
            </div>

            {/* CEFR Level */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                {t("generator.cefrLabel")}
              </Label>
              <div
                className="grid grid-cols-6 gap-1.5"
                aria-label="CEFR Proficiency Level"
              >
                {CEFR_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    aria-pressed={level === lvl}
                    onClick={() => setLevel(lvl)}
                    className={`py-2 text-xs font-semibold rounded-xl transition-colors border ${
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

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                {t("generator.categoryLabel")}
              </Label>
              <Select
                value={category}
                onValueChange={(val) => val && setCategory(val)}
              >
                <SelectTrigger className="w-full h-10 bg-neutral-900 border-neutral-800 text-xs text-neutral-200 focus:ring-sky-500 rounded-xl">
                  <SelectValue placeholder="Select category" />
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
                className="bg-neutral-900 border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-500 rounded-xl"
              />
            </div>

            {/* Progress Stepper Banner during generation */}
            {generateMutation.isPending && (
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
                  <Loader2 className="size-4 animate-spin shrink-0" />
                  <span>{GENERATION_STEPS[generationStep]}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {GENERATION_STEPS.map((_, idx) => (
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

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={generateMutation.isPending}
              onClick={() => setOpen(false)}
              className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending || isSameLanguage}
              className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white gap-2 font-semibold text-xs shadow-md shadow-sky-500/20"
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
