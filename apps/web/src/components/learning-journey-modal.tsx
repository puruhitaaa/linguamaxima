import { Badge } from "@linguamaxima/ui/components/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@linguamaxima/ui/components/select";
import { Textarea } from "@linguamaxima/ui/components/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import {
  useClarifyJourney,
  useGenerateJourney,
  usePreviewJourneyPrompt,
} from "../lib/queries";
import type {
  CEFRLevel,
  ClarificationAnswerItem,
  ClarificationQuestionItem,
} from "../types/api";

const CEFR_OPTIONS: readonly {
  desc: string;
  level: CEFRLevel;
  title: string;
}[] = [
  {
    desc: "Basic survival phrases & core nouns",
    level: "A1",
    title: "Beginner",
  },
  {
    desc: "Routine workplace & daily exchanges",
    level: "A2",
    title: "Elementary",
  },
  {
    desc: "Independent conversations & scenarios",
    level: "B1",
    title: "Intermediate",
  },
  {
    desc: "Fluent professional & nuanced topics",
    level: "B2",
    title: "Upper-Int",
  },
  {
    desc: "Complex technical & academic mastery",
    level: "C1",
    title: "Advanced",
  },
  {
    desc: "Near-native precision & idiomatic flow",
    level: "C2",
    title: "Mastery",
  },
];

const PURPOSE_PRESETS = [
  "Ausbildung",
  "FSJ (Freiwilliges Soziales Jahr)",
  "University Study",
  "Tech Job Interview",
  "Travel & Relocation",
] as const;

type ModalStage = "purpose" | "clarify" | "cefr";

function mergeClarificationAnswers(
  collectedAnswers: ClarificationAnswerItem[],
  questions: ClarificationQuestionItem[],
  draftAnswers: Record<string, { selected: string[]; customText: string }>
): ClarificationAnswerItem[] {
  const nextAnswers = [...collectedAnswers];
  for (const q of questions) {
    const entry = draftAnswers[q.id];
    if (!entry) {
      continue;
    }
    const parts = [...entry.selected];
    if (entry.customText.trim()) {
      parts.push(entry.customText.trim());
    }
    const combined = parts.join(", ").trim();
    if (!combined) {
      continue;
    }
    const existingIdx = nextAnswers.findIndex(
      (item) => item.question_id === q.id
    );
    const item: ClarificationAnswerItem = {
      answer: combined,
      question: q.question,
      question_id: q.id,
    };
    if (existingIdx !== -1) {
      nextAnswers[existingIdx] = item;
    } else {
      nextAnswers.push(item);
    }
  }
  return nextAnswers;
}

function toggleOptionList(
  selected: string[],
  option: string,
  multi: boolean
): string[] {
  const exists = selected.includes(option);
  if (multi) {
    return exists
      ? selected.filter((item) => item !== option)
      : [...selected, option];
  }
  return exists ? [] : [option];
}

function ModalStageSteps({ stage }: { stage: ModalStage }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400">
      <span
        className={stage === "purpose" ? "text-sky-400" : "text-neutral-500"}
      >
        1. Goal
      </span>
      <span>•</span>
      <span
        className={stage === "clarify" ? "text-sky-400" : "text-neutral-500"}
      >
        2. Details
      </span>
      <span>•</span>
      <span className={stage === "cefr" ? "text-sky-400" : "text-neutral-500"}>
        3. Level
      </span>
    </div>
  );
}

function DefaultJourneyTrigger({ label }: { label: string }) {
  return (
    <DialogTrigger
      render={
        <Button
          variant="outline"
          className="gap-1.5 sm:gap-2 bg-neutral-900 hover:bg-neutral-800 border-sky-500/40 text-sky-300 hover:text-white font-semibold px-2.5 sm:px-3.5 min-h-[36px] shrink-0 cursor-pointer"
          aria-label={label}
        >
          <Compass className="size-4 text-sky-400 shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">{label}</span>
        </Button>
      }
    />
  );
}

function ModalCefrStage({
  targetLangName,
  originCode,
  targetCode,
  originFlag,
  targetFlag,
  selectedCefr,
  sectorTag,
  purpose,
  promptSummary,
  synthesizedPrompt,
  isPromptExpanded,
  isPreviewPending,
  isGenerating,
  backLabel,
  buildTreeLabel,
  buildingTreeLabel,
  onSelectCefr,
  onTogglePromptExpanded,
  onChangePrompt,
  onBack,
  onGenerate,
}: {
  targetLangName: string;
  originCode: string;
  targetCode: string;
  originFlag: string;
  targetFlag: string;
  selectedCefr: CEFRLevel;
  sectorTag: string | null;
  purpose: string;
  promptSummary: string;
  synthesizedPrompt: string;
  isPromptExpanded: boolean;
  isPreviewPending: boolean;
  isGenerating: boolean;
  backLabel: string;
  buildTreeLabel: string;
  buildingTreeLabel: string;
  onSelectCefr: (level: CEFRLevel) => void;
  onTogglePromptExpanded: () => void;
  onChangePrompt: (value: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label className="text-xs font-bold text-white">
          Select Target CEFR Level for {targetLangName}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CEFR_OPTIONS.map((opt) => {
            const active = selectedCefr === opt.level;
            return (
              <button
                key={opt.level}
                type="button"
                onClick={() => onSelectCefr(opt.level)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? "bg-sky-500/15 border-sky-400 text-white shadow-sm"
                    : "bg-neutral-900/70 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">
                    {opt.level}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      active ? "text-sky-300" : "text-neutral-400"
                    }`}
                  >
                    {opt.title}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Wand2 className="size-3.5" />
                <span>Synthesized Curriculum Blueprint</span>
              </span>
              <Badge
                variant="outline"
                className="bg-neutral-950 border-neutral-700 text-neutral-200 text-[10px]"
              >
                {originFlag} {originCode.toUpperCase()} → {targetFlag}{" "}
                {targetCode.toUpperCase()} · {selectedCefr}
              </Badge>
              {sectorTag && (
                <Badge
                  variant="outline"
                  className="bg-sky-500/10 border-sky-500/30 text-sky-300 text-[10px]"
                >
                  {sectorTag}
                </Badge>
              )}
            </div>
            {isPreviewPending ? (
              <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Synthesizing tailored prompt...</span>
              </div>
            ) : (
              <p className="text-xs text-neutral-300 leading-relaxed">
                {promptSummary ||
                  `3-phase structured learning tree for "${purpose}" at ${selectedCefr} with core vocabularies, guided dialogues, and milestone checkpoints.`}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onTogglePromptExpanded}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 hover:text-sky-300 transition-colors cursor-pointer"
        >
          {isPromptExpanded ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
          <span>
            {isPromptExpanded
              ? "Hide Master AI Prompt"
              : "Inspect / Edit Master AI Prompt"}
          </span>
        </button>

        {isPromptExpanded && (
          <div className="space-y-1.5">
            <Textarea
              value={synthesizedPrompt}
              onChange={(e) => onChangePrompt(e.target.value)}
              rows={4}
              className="text-xs bg-neutral-950 border-neutral-800 text-neutral-200 rounded-xl leading-relaxed"
            />
            <p className="text-[11px] text-neutral-400">
              You can customize this prompt directly before generating your
              entire learning tree.
            </p>
          </div>
        )}
      </div>

      <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          disabled={isGenerating}
          onClick={onBack}
          className="text-xs text-neutral-400 hover:text-white gap-1 cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          <span>{backLabel}</span>
        </Button>

        <Button
          type="button"
          disabled={isGenerating || isPreviewPending}
          onClick={onGenerate}
          className="bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl gap-2 cursor-pointer shadow-md shadow-sky-500/20"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>{buildingTreeLabel}</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              <span>{buildTreeLabel}</span>
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function LearningJourneyModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    availableLanguages,
    getLanguageFlag,
    originLanguage,
    targetLanguage,
  } = useLanguagePair();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [stage, setStage] = useState<ModalStage>("purpose");
  const [purpose, setPurpose] = useState("");
  const [originCode, setOriginCode] = useState(originLanguage.code);
  const [targetCode, setTargetCode] = useState(targetLanguage.code);

  const [round, setRound] = useState(1);
  const [questions, setQuestions] = useState<ClarificationQuestionItem[]>([]);
  const [draftAnswers, setDraftAnswers] = useState<
    Record<string, { selected: string[]; customText: string }>
  >({});
  const [collectedAnswers, setCollectedAnswers] = useState<
    ClarificationAnswerItem[]
  >([]);
  const [draftSummary, setDraftSummary] = useState("");
  const [sectorTag, setSectorTag] = useState<string | null>(null);

  const [selectedCefr, setSelectedCefr] = useState<CEFRLevel>("B1");
  const [synthesizedPrompt, setSynthesizedPrompt] = useState("");
  const [promptSummary, setPromptSummary] = useState("");
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  const clarifyMutation = useClarifyJourney();
  const previewPromptMutation = usePreviewJourneyPrompt();
  const generateMutation = useGenerateJourney();

  const isSameLanguage = originCode === targetCode;

  const resetForm = () => {
    setStage("purpose");
    setPurpose("");
    setOriginCode(originLanguage.code);
    setTargetCode(targetLanguage.code);
    setRound(1);
    setQuestions([]);
    setDraftAnswers({});
    setCollectedAnswers([]);
    setDraftSummary("");
    setSectorTag(null);
    setSelectedCefr("B1");
    setSynthesizedPrompt("");
    setPromptSummary("");
    setIsPromptExpanded(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOriginCode(originLanguage.code);
      setTargetCode(targetLanguage.code);
    } else if (!generateMutation.isPending) {
      resetForm();
    }
    setOpen(nextOpen);
  };

  const fetchPromptPreview = async (
    level: CEFRLevel,
    answers: ClarificationAnswerItem[]
  ) => {
    if (!purpose.trim()) {
      return;
    }
    try {
      const preview = await previewPromptMutation.mutateAsync({
        cefr_level: level,
        clarifications: answers,
        origin_language_code: originCode,
        purpose: purpose.trim(),
        target_language_code: targetCode,
      });
      setSynthesizedPrompt(preview.synthesized_prompt);
      setPromptSummary(preview.summary);
      if (preview.recommended_sector_tag) {
        setSectorTag(preview.recommended_sector_tag);
      }
    } catch {
      // Handled by mutation toast
    }
  };

  useEffect(() => {
    if (stage === "cefr" && open && purpose.trim()) {
      void fetchPromptPreview(selectedCefr, collectedAnswers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, selectedCefr]);

  const handleSwapLanguages = () => {
    const prev = originCode;
    setOriginCode(targetCode);
    setTargetCode(prev);
  };

  const handlePurposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim() || isSameLanguage) {
      return;
    }

    try {
      const res = await clarifyMutation.mutateAsync({
        answers: [],
        origin_language_code: originCode,
        purpose: purpose.trim(),
        round: 1,
        target_language_code: targetCode,
      });
      setDraftSummary(res.draft_summary);
      setSectorTag(res.recommended_sector_tag ?? null);

      if (res.is_sufficient || res.questions.length === 0) {
        if (res.synthesized_prompt) {
          setSynthesizedPrompt(res.synthesized_prompt);
        }
        setStage("cefr");
      } else {
        setQuestions(res.questions);
        setRound(1);
        setDraftAnswers({});
        setStage("clarify");
      }
    } catch {
      // Handled by mutation toast
    }
  };

  const toggleChipOption = (
    questionId: string,
    option: string,
    multi: boolean
  ) => {
    setDraftAnswers((prev) => {
      const current = prev[questionId] ?? { customText: "", selected: [] };
      return {
        ...prev,
        [questionId]: {
          ...current,
          selected: toggleOptionList(current.selected, option, multi),
        },
      };
    });
  };

  const setCustomQuestionText = (questionId: string, value: string) => {
    setDraftAnswers((prev) => {
      const current = prev[questionId] ?? { customText: "", selected: [] };
      return {
        ...prev,
        [questionId]: { ...current, customText: value },
      };
    });
  };

  const buildMergedClarifications = (): ClarificationAnswerItem[] =>
    mergeClarificationAnswers(collectedAnswers, questions, draftAnswers);

  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const merged = buildMergedClarifications();
    setCollectedAnswers(merged);

    if (round >= 2) {
      setStage("cefr");
      return;
    }

    try {
      const res = await clarifyMutation.mutateAsync({
        answers: merged,
        origin_language_code: originCode,
        purpose: purpose.trim(),
        round: round + 1,
        target_language_code: targetCode,
      });
      setDraftSummary(res.draft_summary);
      if (res.recommended_sector_tag) {
        setSectorTag(res.recommended_sector_tag);
      }

      if (res.is_sufficient || res.questions.length === 0) {
        setStage("cefr");
      } else {
        setQuestions(res.questions);
        setRound((r) => r + 1);
        setDraftAnswers({});
      }
    } catch {
      // Handled by mutation toast
    }
  };

  const handleSkipClarify = () => {
    const merged = buildMergedClarifications();
    setCollectedAnswers(merged);
    setStage("cefr");
  };

  const handleGenerateJourney = async () => {
    if (!purpose.trim() || isSameLanguage) {
      return;
    }
    try {
      const journey = await generateMutation.mutateAsync({
        cefr_level: selectedCefr,
        clarifications: collectedAnswers,
        custom_prompt_override: synthesizedPrompt.trim() || undefined,
        origin_language_code: originCode,
        purpose: purpose.trim(),
        target_language_code: targetCode,
      });
      setOpen(false);
      resetForm();
      navigate({
        params: { journeyId: String(journey.id) },
        to: "/journeys/$journeyId",
      });
    } catch {
      // Handled by mutation toast
    }
  };

  const activeTargetLang =
    availableLanguages.find((l) => l.code === targetCode) || targetLanguage;
  const activeOriginLang =
    availableLanguages.find((l) => l.code === originCode) || originLanguage;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== undefined && (
        <DialogTrigger render={trigger as React.ReactElement} />
      )}
      {trigger === undefined && controlledOpen === undefined && (
        <DefaultJourneyTrigger label={t("header.newJourney")} />
      )}

      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl bg-neutral-950 text-neutral-100 border-neutral-800 p-5 sm:p-6 w-[calc(100%-1.5rem)] sm:w-full rounded-2xl sm:rounded-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
              <Compass className="size-5 text-sky-400 shrink-0" />
              <span>{t("journeys.modalTitle")}</span>
            </DialogTitle>
            <ModalStageSteps stage={stage} />
          </div>
          <DialogDescription className="text-neutral-400 text-xs leading-relaxed">
            Tell AI what you want to achieve in {activeTargetLang.name}. We will
            map out every vocabulary, story, and milestone without blocking your
            other journeys.
          </DialogDescription>
        </DialogHeader>

        {/* STAGE 1: PURPOSE & LANGUAGES */}
        {stage === "purpose" && (
          <form onSubmit={handlePurposeSubmit} className="space-y-5 pt-2">
            {/* Language Pair Selection */}
            <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2.5">
              <div className="text-[11px] uppercase font-bold tracking-wider text-neutral-400">
                Journey Language Pair
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <Label className="text-[11px] text-neutral-400 block font-medium">
                    {t("generator.iSpeakLabel")}
                  </Label>
                  <Select
                    value={originCode}
                    onValueChange={(val) => val && setOriginCode(val)}
                  >
                    <SelectTrigger className="w-full h-9 bg-neutral-950 border-neutral-700 text-xs text-neutral-200 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-950 border-neutral-800 text-neutral-200">
                      {availableLanguages.map((l) => (
                        <SelectItem key={`j-orig-${l.code}`} value={l.code}>
                          <span>{getLanguageFlag(l.code)}</span>
                          <span>{l.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="shrink-0 pt-5">
                  <button
                    type="button"
                    onClick={handleSwapLanguages}
                    className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                    aria-label="Swap languages"
                  >
                    <ArrowLeftRight className="size-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <Label className="text-[11px] text-sky-400 block font-bold">
                    {t("generator.iLearnLabel")}
                  </Label>
                  <Select
                    value={targetCode}
                    onValueChange={(val) => val && setTargetCode(val)}
                  >
                    <SelectTrigger className="w-full h-9 bg-neutral-950 border-sky-500/50 text-xs text-white font-bold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-950 border-neutral-800 text-neutral-200">
                      {availableLanguages.map((l) => (
                        <SelectItem key={`j-targ-${l.code}`} value={l.code}>
                          <span>{getLanguageFlag(l.code)}</span>
                          <span>{l.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isSameLanguage && (
                <p className="text-xs text-rose-400 font-medium">
                  {t("modal.sameLanguageError")}
                </p>
              )}
            </div>

            {/* Learning Purpose Input */}
            <div className="space-y-2.5">
              <Label
                htmlFor="journey-purpose-input"
                className="text-xs font-bold text-white"
              >
                {t("journeys.purposeLabel")}
              </Label>
              <Input
                id="journey-purpose-input"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={t("journeys.purposePlaceholder")}
                className="h-11 bg-neutral-900 border-neutral-700 text-sm text-white placeholder:text-neutral-500 rounded-xl focus-visible:ring-sky-500"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PURPOSE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPurpose(preset)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      purpose === preset
                        ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={
                  !purpose.trim() || isSameLanguage || clarifyMutation.isPending
                }
                className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl gap-2 cursor-pointer"
              >
                {clarifyMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Analyzing Goal...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Analyze & Continue</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STAGE 2: AI CLARIFICATION QUESTIONS */}
        {stage === "clarify" && (
          <form onSubmit={handleClarifySubmit} className="space-y-4 pt-2">
            <div className="p-3 rounded-2xl bg-sky-950/30 border border-sky-500/30 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                  Refining: {purpose} (Round {round}/2)
                </span>
                <p className="text-xs text-neutral-200 leading-relaxed">
                  {draftSummary}
                </p>
              </div>
              {sectorTag && (
                <Badge
                  variant="outline"
                  className="bg-sky-500/15 border-sky-500/30 text-sky-300 shrink-0"
                >
                  {sectorTag}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {questions.map((q) => {
                const ans = draftAnswers[q.id] ?? {
                  customText: "",
                  selected: [],
                };
                const isMulti = q.input_type === "multi_chips";
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2.5"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-white">
                        {q.question}
                      </p>
                      {q.hint && (
                        <p className="text-xs text-neutral-400">{q.hint}</p>
                      )}
                    </div>

                    {q.suggested_options.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {q.suggested_options.map((opt) => {
                          const isSelected = ans.selected.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                toggleChipOption(q.id, opt, isMulti)
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-sky-500 text-white border-sky-400 shadow-sm"
                                  : "bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white"
                              }`}
                            >
                              {isSelected && <Check className="size-3" />}
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <Input
                      value={ans.customText}
                      onChange={(e) =>
                        setCustomQuestionText(q.id, e.target.value)
                      }
                      placeholder="Or type your own specifics..."
                      className="h-9 text-xs bg-neutral-950 border-neutral-800 text-neutral-200 placeholder:text-neutral-500 rounded-xl"
                    />
                  </div>
                );
              })}
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStage("purpose")}
                  className="text-xs text-neutral-400 hover:text-white gap-1 cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>{t("common.back")}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipClarify}
                  className="text-xs border-neutral-800 text-neutral-300 hover:text-white rounded-xl cursor-pointer"
                >
                  {t("journeys.skipAndContinue")}
                </Button>
              </div>
              <Button
                type="submit"
                disabled={clarifyMutation.isPending}
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl gap-2 cursor-pointer"
              >
                {clarifyMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Refining...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STAGE 3: CEFR LEVEL & PROMPT BLUEPRINT */}
        {stage === "cefr" && (
          <ModalCefrStage
            targetLangName={activeTargetLang.name}
            originCode={activeOriginLang.code}
            targetCode={activeTargetLang.code}
            originFlag={getLanguageFlag(activeOriginLang.code)}
            targetFlag={getLanguageFlag(activeTargetLang.code)}
            selectedCefr={selectedCefr}
            sectorTag={sectorTag}
            purpose={purpose}
            promptSummary={promptSummary}
            synthesizedPrompt={synthesizedPrompt}
            isPromptExpanded={isPromptExpanded}
            isPreviewPending={previewPromptMutation.isPending}
            isGenerating={generateMutation.isPending}
            backLabel={t("common.back")}
            buildTreeLabel={t("journeys.buildTreeBtn")}
            buildingTreeLabel={t("journeys.buildingTreeBtn")}
            onSelectCefr={setSelectedCefr}
            onTogglePromptExpanded={() => setIsPromptExpanded((prev) => !prev)}
            onChangePrompt={setSynthesizedPrompt}
            onBack={() =>
              setStage(questions.length > 0 ? "clarify" : "purpose")
            }
            onGenerate={handleGenerateJourney}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
