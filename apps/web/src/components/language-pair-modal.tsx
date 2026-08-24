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
import { ArrowLeftRight, Check, Globe, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useLanguagePair } from "../lib/language-context";
import { useCreateLanguagePair } from "../lib/queries";
import type { Language } from "../types/api";

const PRESETS = [
  {
    label: "German from Indonesian",
    origin: "id",
    target: "de",
  },
  {
    label: "German from English",
    origin: "en",
    target: "de",
  },
  {
    label: "Spanish from English",
    origin: "en",
    target: "es",
  },
  {
    label: "French from English",
    origin: "en",
    target: "fr",
  },
  {
    label: "Japanese from Indonesian",
    origin: "id",
    target: "ja",
  },
  {
    label: "English from Indonesian",
    origin: "id",
    target: "en",
  },
];

export function LanguagePairModal({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
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

  const createPairMutation = useCreateLanguagePair();

  // Keep synced when opened
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedOrigin(originLanguage);
      setSelectedTarget(targetLanguage);
      setSearch("");
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
    if (selectedOrigin.code === selectedTarget.code) {
      toast.error("Origin and target languages cannot be the same.");
      return;
    }
    setLanguagePair(selectedOrigin, selectedTarget);
    createPairMutation.mutate({
      origin_language_code: selectedOrigin.code,
      target_language_code: selectedTarget.code,
    });
    toast.success(
      `Switched to learning ${selectedTarget.name} from ${selectedOrigin.name}!`
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
            Choose Language Pair
          </DialogTitle>
          <DialogDescription className="text-neutral-400 text-xs">
            Select what language you speak and what language you want to learn.
            Stories, vocabulary, grammar, and audio will adapt to your choice.
          </DialogDescription>
        </DialogHeader>

        {/* Current Pair Selection Showcase */}
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 my-2">
          {/* Origin Language Box */}
          <button
            type="button"
            onClick={() => setActiveTab("origin")}
            className={`flex-1 text-left p-3 rounded-xl border transition-all ${
              activeTab === "origin"
                ? "bg-neutral-800 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500"
                : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1">
              I Speak (Origin)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {getLanguageFlag(selectedOrigin.code)}
              </span>
              <div>
                <div className="font-bold text-sm text-white">
                  {selectedOrigin.name}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {selectedOrigin.native_name || selectedOrigin.code}
                </div>
              </div>
            </div>
          </button>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwap}
            title="Swap Origin and Target"
            className="p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white transition-all transform hover:scale-105 active:scale-95 shrink-0"
          >
            <ArrowLeftRight className="size-4" />
          </button>

          {/* Target Language Box */}
          <button
            type="button"
            onClick={() => setActiveTab("target")}
            className={`flex-1 text-left p-3 rounded-xl border transition-all ${
              activeTab === "target"
                ? "bg-neutral-800 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500"
                : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1">
              I Want to Learn (Target)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {getLanguageFlag(selectedTarget.code)}
              </span>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  {selectedTarget.name}
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-bold">
                    Target
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  {selectedTarget.native_name || selectedTarget.code}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
            <Sparkles className="size-3 text-amber-400" />
            Popular Combinations:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const isCurrent =
                selectedOrigin.code === p.origin &&
                selectedTarget.code === p.target;
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
                  {getLanguageFlag(p.target)} {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection Grid with Search */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-neutral-300">
              Select {activeTab === "origin" ? "Origin" : "Target"} Language:
            </span>
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-500" />
              <Input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-neutral-900 border-neutral-800 rounded-lg text-neutral-200 placeholder:text-neutral-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
            {filteredLanguages.map((lang) => {
              const isSelected =
                activeTab === "origin"
                  ? selectedOrigin.code === lang.code
                  : selectedTarget.code === lang.code;

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    if (activeTab === "origin") {
                      setSelectedOrigin(lang);
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
                      <div className="text-[10px] text-neutral-400 truncate">
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

        <DialogFooter className="gap-2 sm:gap-0 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs gap-1.5 shadow-md shadow-sky-500/20"
          >
            <Check className="size-4" />
            Apply & Learn {selectedTarget.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
