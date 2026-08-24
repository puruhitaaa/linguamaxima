import { Button } from "@linguamaxima/ui/components/button";
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
import { ArrowLeftRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

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
    targetLanguage,
  } = useLanguagePair();

  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [category, setCategory] = useState("travel");
  const [topicHint, setTopicHint] = useState("");
  const [originCode, setOriginCode] = useState(originLanguage.code);
  const [targetCode, setTargetCode] = useState(targetLanguage.code);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOriginCode(originLanguage.code);
      setTargetCode(targetLanguage.code);
    }
    setOpen(nextOpen);
  };

  const generateMutation = useGenerateStory();

  const handleSwap = () => {
    const prevOrigin = originCode;
    setOriginCode(targetCode);
    setTargetCode(prevOrigin);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
              <div className="text-[11px] uppercase font-bold tracking-wider text-neutral-400">
                {t("generator.languageDirection")}
              </div>
              <div className="grid grid-cols-11 gap-2 items-center">
                <div className="col-span-5 space-y-1">
                  <span className="text-[10px] text-neutral-400 block font-medium">
                    {t("generator.iSpeakLabel")}
                  </span>
                  <select
                    value={originCode}
                    onChange={(e) => setOriginCode(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                  >
                    {availableLanguages.map((l) => (
                      <option key={`dlg-orig-${l.code}`} value={l.code}>
                        {getLanguageFlag(l.code)} {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 flex justify-center pt-3">
                  <button
                    type="button"
                    onClick={handleSwap}
                    title={t("generator.swapTooltip")}
                    className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition-colors"
                  >
                    <ArrowLeftRight className="size-3.5" />
                  </button>
                </div>

                <div className="col-span-5 space-y-1">
                  <span className="text-[10px] text-sky-400 block font-bold">
                    {t("generator.iLearnLabel")}
                  </span>
                  <select
                    value={targetCode}
                    onChange={(e) => setTargetCode(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl bg-neutral-950 border border-sky-500/50 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-bold"
                  >
                    {availableLanguages.map((l) => (
                      <option key={`dlg-targ-${l.code}`} value={l.code}>
                        {getLanguageFlag(l.code)} {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* CEFR Level */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                {t("generator.cefrLabel")}
              </Label>
              <div className="grid grid-cols-6 gap-1.5">
                {CEFR_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
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
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {CATEGORY_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {tCategory(slug)}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Hint */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                {t("generator.topicHintLabel")}
              </Label>
              <Input
                placeholder={t("generator.topicHintPlaceholder")}
                value={topicHint}
                onChange={(e) => setTopicHint(e.target.value)}
                className="bg-neutral-900 border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-500 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending}
              className="bg-sky-500 hover:bg-sky-600 text-white gap-2 font-semibold text-xs shadow-md shadow-sky-500/20"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("generator.generatingBtn", {
                    target: activeTargetLang.name,
                  })}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {t("generator.generateBtn", {
                    target: activeTargetLang.name,
                  })}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
