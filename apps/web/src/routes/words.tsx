import { Badge } from "@linguamaxima/ui/components/badge";
import { Button } from "@linguamaxima/ui/components/button";
import { Input } from "@linguamaxima/ui/components/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookA,
  BookOpen,
  Check,
  Globe,
  Layers,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { playPronunciationAudio } from "../lib/audio";
import type { TranslationKey } from "../lib/i18n";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import {
  useInfiniteWords,
  useLanguages,
  useSaveWordFlashcard,
  useWordFilters,
} from "../lib/queries";
import type {
  CEFRLevel,
  LanguageItem,
  WordFilterMeta,
  WordItem,
} from "../types/api";

const wordsSearchSchema = z.object({
  lang: z.string().optional().default(""),
  level: z.string().optional().default("all"),
  pos: z.string().optional().default("all"),
  search: z.string().optional().default(""),
});

export const Route = createFileRoute("/words")({
  component: WordsExplorerComponent,
  validateSearch: (search: Record<string, unknown>) =>
    wordsSearchSchema.parse(search),
});

const POS_CATEGORIES: readonly { key: string; labelKey: TranslationKey }[] = [
  { key: "all", labelKey: "dictionary.allPos" },
  { key: "conjunction", labelKey: "dictionary.conjunction" },
  { key: "verb", labelKey: "dictionary.verb" },
  { key: "noun", labelKey: "dictionary.noun" },
  { key: "adjective", labelKey: "dictionary.adjective" },
  { key: "adverb", labelKey: "dictionary.adverb" },
  { key: "preposition", labelKey: "dictionary.preposition" },
  { key: "pronoun", labelKey: "dictionary.pronoun" },
  { key: "interjection", labelKey: "dictionary.interjection" },
  { key: "phrase", labelKey: "dictionary.phrase" },
];

const CEFR_LEVEL_COLORS: Record<CEFRLevel, string> = {
  A1: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  A2: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  B1: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  B2: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  C1: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  C2: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

interface HeroSectionProps {
  activeLangCode: string;
  frameworkLabel: string;
  languages?: LanguageItem[];
  onLanguageChange: (langCode: string) => void;
  totalWords?: number;
}

function WordsHeroSection({
  activeLangCode,
  frameworkLabel,
  languages,
  onLanguageChange,
  totalWords,
}: HeroSectionProps) {
  const { t } = useTranslation();
  const { getLanguageFlag } = useLanguagePair();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-950/40 via-neutral-900 to-neutral-950 border border-neutral-800/80 p-6 sm:p-8">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>{t("dictionary.badge")}</span>
            <span className="text-neutral-500">•</span>
            <span>
              {t("dictionary.nativeFrameworkBadge", {
                framework: frameworkLabel,
              })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookA className="size-7 sm:size-8 text-sky-400 shrink-0" />
            <span>{t("dictionary.title")}</span>
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {t("dictionary.subtitle")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-neutral-950/80 border border-neutral-800/90 rounded-2xl p-2 shadow-sm">
            <span className="text-xs font-semibold text-neutral-400 pl-2 flex items-center gap-1.5 shrink-0">
              <Globe className="size-3.5 text-neutral-400" />
              <span>{t("common.target")}:</span>
            </span>
            <select
              value={activeLangCode}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-neutral-900 text-white text-xs sm:text-sm font-bold py-1.5 px-3 rounded-xl border border-neutral-800 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
              aria-label="Select Target Language"
            >
              {languages?.map((langItem) => (
                <option key={langItem.code} value={langItem.code}>
                  {getLanguageFlag(langItem.code)} {langItem.name} (
                  {langItem.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {typeof totalWords === "number" && totalWords > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/90 text-neutral-300 text-xs font-medium">
              <BookOpen className="size-4 text-sky-400 shrink-0" />
              <span>
                <strong className="text-white font-bold">
                  {totalWords.toLocaleString()}
                </strong>{" "}
                {t("common.words").toLowerCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface WordCardItemProps {
  activeLangCode: string;
  isPlaying: boolean;
  onPlayAudio: (word: WordItem) => void;
  onSaveFlashcard: (wordId: number) => void;
  isSaving: boolean;
  word: WordItem;
}

function WordCardItem({
  activeLangCode,
  isPlaying,
  onPlayAudio,
  onSaveFlashcard,
  isSaving,
  word,
}: WordCardItemProps) {
  const { t } = useTranslation();
  const { getLanguageFlag } = useLanguagePair();
  const levelColor =
    CEFR_LEVEL_COLORS[word.normalized_level] ??
    "bg-neutral-800 text-neutral-300 border-neutral-700";

  return (
    <div className="group flex flex-col justify-between rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 p-5 transition-all shadow-sm hover:shadow-lg hover:shadow-sky-500/5 hover:bg-neutral-900/90">
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {word.lemma}
              </span>
              {word.gender && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-semibold border border-neutral-700/60">
                  {word.gender}
                </span>
              )}
            </div>
            {word.phonetic && (
              <div className="text-xs font-mono text-neutral-400">
                /{word.phonetic}/
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onPlayAudio(word)}
              disabled={isPlaying}
              className="flex items-center justify-center size-8 rounded-xl bg-neutral-800/80 hover:bg-sky-500/20 text-neutral-300 hover:text-sky-400 border border-neutral-700/60 transition-colors cursor-pointer"
              title={t("dictionary.listenPronunciation")}
              aria-label={`Listen to ${word.lemma}`}
            >
              <Volume2
                className={`size-4 ${
                  isPlaying ? "text-sky-400 animate-pulse" : ""
                }`}
              />
            </button>
            <Badge
              variant="outline"
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${levelColor}`}
            >
              {word.native_level || word.normalized_level}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-400 text-[11px] font-medium uppercase tracking-wider border border-neutral-800">
            {word.part_of_speech}
          </div>
          <p className="text-sm font-semibold text-neutral-100 leading-snug">
            {word.translation}
          </p>
          {word.definition && (
            <p className="text-xs text-neutral-400 leading-relaxed italic line-clamp-2">
              {word.definition}
            </p>
          )}
        </div>

        {word.example_sentence && (
          <div className="mt-3 pt-3 border-t border-neutral-800/60 space-y-1.5 rounded-xl bg-neutral-950/60 border border-neutral-800/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <span>{getLanguageFlag(activeLangCode)}</span>
              <span>{t("dictionary.exampleLabel")}</span>
            </span>
            <p className="text-xs text-neutral-200 font-medium leading-relaxed">
              {word.example_sentence}
            </p>
            {word.example_translation && (
              <p className="text-xs text-neutral-400 leading-relaxed">
                {word.example_translation}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={word.is_saved_as_flashcard || isSaving}
          onClick={() => onSaveFlashcard(word.id)}
          className={`w-full h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            word.is_saved_as_flashcard
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 cursor-default"
              : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800 hover:text-white hover:border-neutral-700"
          }`}
        >
          {word.is_saved_as_flashcard ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              <span>{t("dictionary.savedInDeck")}</span>
            </>
          ) : (
            <>
              <Layers className="size-3.5 text-sky-400" />
              <span>{t("dictionary.saveToFlashcards")}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface FilterBarProps {
  filterMeta?: WordFilterMeta;
  level: string;
  onLevelChange: (lvl: string) => void;
  onPosChange: (pos: string) => void;
  onReset: () => void;
  onSearchChange: (s: string) => void;
  pos: string;
  search: string;
  searchInput: string;
}

function WordFiltersBar({
  filterMeta,
  level,
  onLevelChange,
  onPosChange,
  onReset,
  onSearchChange,
  pos,
  search,
  searchInput,
}: FilterBarProps) {
  const { t } = useTranslation();
  const hasActiveFilters = level !== "all" || pos !== "all" || search !== "";

  return (
    <div className="space-y-4">
      {/* Top filter row: Search bar & Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500 pointer-events-none" />
          <Input
            type="text"
            placeholder={t("dictionary.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-neutral-900 border-neutral-800 text-neutral-200 placeholder:text-neutral-500 rounded-xl focus-visible:ring-1 focus-visible:ring-sky-500"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="self-start sm:self-auto h-9 px-3.5 border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl shrink-0 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>{t("dictionary.resetFilters")}</span>
          </Button>
        )}
      </div>

      {/* CEFR Level filter row */}
      <div className="space-y-1.5">
        <div className="overflow-x-auto max-w-full -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-w-0">
          <div className="flex items-center gap-1.5 w-max sm:w-auto pb-0.5">
            <button
              type="button"
              onClick={() => onLevelChange("all")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
                level === "all"
                  ? "bg-neutral-800 border-neutral-700 text-white shadow-sm"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
              }`}
            >
              {t("dictionary.allLevels")}
            </button>

            {filterMeta?.levels.map((lvl) => {
              const isActive = level === lvl.key;
              return (
                <button
                  key={lvl.key}
                  type="button"
                  onClick={() => onLevelChange(lvl.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-neutral-800 border-neutral-700 text-white shadow-sm"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                  }`}
                >
                  <span>{lvl.label}</span>
                  {lvl.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                        isActive
                          ? "bg-neutral-700 text-neutral-200"
                          : "bg-neutral-950 text-neutral-500"
                      }`}
                    >
                      {lvl.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Part of speech filter pills */}
      <div className="space-y-1.5">
        <div className="overflow-x-auto max-w-full -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-2 text-xs w-max sm:w-auto pb-1 sm:pb-0">
            {POS_CATEGORIES.map(({ key, labelKey }) => {
              const isActive = pos === key;
              const countMeta = filterMeta?.parts_of_speech.find(
                (p) => p.key === key
              );

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPosChange(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-neutral-100 text-neutral-900 font-semibold"
                      : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800"
                  }`}
                >
                  <span>{t(labelKey)}</span>
                  {countMeta && countMeta.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? "bg-neutral-900/20 text-neutral-900"
                          : "bg-neutral-950 text-neutral-500"
                      }`}
                    >
                      {countMeta.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function WordsEmptyState({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16 px-4 rounded-2xl bg-neutral-900/30 border border-neutral-800/80 space-y-4 max-w-md mx-auto">
      <div className="size-12 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
        <BookOpen className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">
          {t("dictionary.emptyTitle")}
        </h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          {t("dictionary.emptyDesc")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs rounded-xl cursor-pointer"
      >
        <RotateCcw className="size-3.5 mr-1.5" />
        <span>{t("dictionary.resetFilters")}</span>
      </Button>
    </div>
  );
}

interface WordsGridProps {
  activeLangCode: string;
  isLoading: boolean;
  isSaving: boolean;
  onPlayAudio: (word: WordItem) => void;
  onReset: () => void;
  onSaveFlashcard: (id: number) => void;
  playingWordId: number | null;
  words: WordItem[];
}

function WordsGrid({
  activeLangCode,
  isLoading,
  isSaving,
  onPlayAudio,
  onReset,
  onSaveFlashcard,
  playingWordId,
  words,
}: WordsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-2xl bg-neutral-900/60 border border-neutral-800 p-5 space-y-4 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <div className="h-6 w-32 bg-neutral-800 rounded-lg" />
              <div className="h-6 w-16 bg-neutral-800 rounded-lg" />
            </div>
            <div className="h-4 w-48 bg-neutral-850 rounded" />
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full bg-neutral-850 rounded" />
              <div className="h-3 w-3/4 bg-neutral-850 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (words.length === 0) {
    return <WordsEmptyState onReset={onReset} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {words.map((word) => (
        <WordCardItem
          key={word.id}
          activeLangCode={activeLangCode}
          isPlaying={playingWordId === word.id}
          onPlayAudio={onPlayAudio}
          onSaveFlashcard={onSaveFlashcard}
          isSaving={isSaving}
          word={word}
        />
      ))}
    </div>
  );
}

function WordsExplorerComponent() {
  const { lang, level, pos, search } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { t } = useTranslation();
  const { targetLanguage } = useLanguagePair();
  const { data: languages } = useLanguages();

  const activeLangCode = lang || targetLanguage.code || "de";
  const [searchInput, setSearchInput] = useState(search);
  const [playingWordId, setPlayingWordId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        navigate({
          search: (prev) => ({
            ...prev,
            search: searchInput,
          }),
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, navigate]);

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteWords({
    lang: activeLangCode,
    level: level === "all" ? undefined : level,
    page_size: 24,
    pos: pos === "all" ? undefined : pos,
    search: search || undefined,
  });

  const allWords = useMemo(() => {
    if (!infiniteData?.pages) {
      return [];
    }
    const seen = new Set<number>();
    const items: WordItem[] = [];
    for (const page of infiniteData.pages) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          items.push(item);
        }
      }
    }
    return items;
  }, [infiniteData]);

  const totalWordsCount = infiniteData?.pages[0]?.total ?? 0;

  const { data: filterMeta } = useWordFilters(activeLangCode);
  const saveWordFlashcard = useSaveWordFlashcard();

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // When filters change, reset window scroll to top so lower sentinel is not prematurely triggered
  useEffect(() => {
    window.scrollTo({ behavior: "instant", top: 0 });
  }, [activeLangCode, level, pos, search]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [first] = entries;
        if (
          first?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isLoading
        ) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.unobserve(sentinel);
    };
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const handleLanguageChange = useCallback(
    (newLangCode: string) => {
      navigate({
        search: (prev) => ({
          ...prev,
          lang: newLangCode,
          level: "all",
          pos: "all",
        }),
      });
    },
    [navigate]
  );

  const handleLevelChange = useCallback(
    (newLevel: string) => {
      navigate({
        search: (prev) => ({ ...prev, level: newLevel }),
      });
    },
    [navigate]
  );

  const handlePosChange = useCallback(
    (newPos: string) => {
      navigate({
        search: (prev) => ({ ...prev, pos: newPos }),
      });
    },
    [navigate]
  );

  const handleResetFilters = useCallback(() => {
    setSearchInput("");
    navigate({
      search: () => ({
        lang: activeLangCode,
        level: "all",
        pos: "all",
        search: "",
      }),
    });
  }, [activeLangCode, navigate]);

  const handlePlayAudio = useCallback(
    async (word: WordItem) => {
      setPlayingWordId(word.id);
      try {
        await playPronunciationAudio(
          word.lemma,
          activeLangCode,
          word.audio_url || undefined
        );
      } catch (error) {
        console.error("Audio playback error:", error);
      } finally {
        setPlayingWordId(null);
      }
    },
    [activeLangCode]
  );

  const currentLanguageName = useMemo(() => {
    const found = languages?.find((l) => l.code === activeLangCode);
    return found?.name || activeLangCode.toUpperCase();
  }, [languages, activeLangCode]);

  const frameworkLabel = useMemo(() => {
    const fw = filterMeta?.proficiency_framework || "cefr";
    return fw.toUpperCase();
  }, [filterMeta]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      <WordsHeroSection
        activeLangCode={activeLangCode}
        frameworkLabel={frameworkLabel}
        languages={languages}
        onLanguageChange={handleLanguageChange}
        totalWords={filterMeta?.total_words}
      />

      <WordFiltersBar
        filterMeta={filterMeta}
        level={level}
        onLevelChange={handleLevelChange}
        onPosChange={handlePosChange}
        onReset={handleResetFilters}
        onSearchChange={setSearchInput}
        pos={pos}
        search={search}
        searchInput={searchInput}
      />

      <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-400 font-medium px-1">
        <span>
          {t("dictionary.showingCount", {
            count: allWords.length,
            language: currentLanguageName,
            total: totalWordsCount,
          })}
        </span>
        {totalWordsCount > 0 && (
          <span className="text-xs text-neutral-500 font-medium">
            {Math.min(
              100,
              Math.round((allWords.length / totalWordsCount) * 100)
            )}
            % loaded
          </span>
        )}
      </div>

      <WordsGrid
        activeLangCode={activeLangCode}
        isLoading={isLoading}
        onPlayAudio={handlePlayAudio}
        onReset={handleResetFilters}
        onSaveFlashcard={(id) => saveWordFlashcard.mutate(id)}
        isSaving={saveWordFlashcard.isPending}
        playingWordId={playingWordId}
        words={allWords}
      />

      {/* Infinite scroll sentinel and status */}
      <div
        ref={loadMoreRef}
        className="py-8 flex flex-col items-center justify-center gap-3 min-h-16"
      >
        {isFetchingNextPage && (
          <div className="flex items-center gap-2.5 text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-4 py-2.5 rounded-full animate-pulse shadow-sm">
            <Loader2 className="size-4 animate-spin text-sky-400" />
            <span>{t("dictionary.loadingMore")}</span>
          </div>
        )}

        {!isFetchingNextPage && hasNextPage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            className="border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl text-xs h-9 px-4 cursor-pointer"
          >
            {t("dictionary.loadMore")}
          </Button>
        )}

        {!hasNextPage && allWords.length > 0 && !isLoading && (
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium py-2 px-3.5 rounded-full bg-neutral-900/50 border border-neutral-800/60">
            <Check className="size-3.5 text-emerald-500" />
            <span>
              {t("dictionary.allLoaded", {
                total: totalWordsCount.toLocaleString(),
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
