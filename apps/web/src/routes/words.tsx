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
  RotateCcw,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { playPronunciationAudio } from "../lib/audio";
import type { TranslationKey } from "../lib/i18n";
import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import {
  useLanguages,
  useSaveWordFlashcard,
  useWordFilters,
  useWords,
} from "../lib/queries";
import type {
  CEFRLevel,
  LanguageItem,
  WordFilterMeta,
  WordItem,
  WordListResponse,
} from "../types/api";

const wordsSearchSchema = z.object({
  lang: z.string().optional().default(""),
  level: z.string().optional().default("all"),
  page: z.number().optional().default(1),
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
  A1: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  A2: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  B1: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  B2: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  C1: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  C2: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
};

interface HeroSectionProps {
  activeLangCode: string;
  frameworkLabel: string;
  languages?: LanguageItem[];
  onLanguageChange: (langCode: string) => void;
}

function WordsHeroSection({
  activeLangCode,
  frameworkLabel,
  languages,
  onLanguageChange,
}: HeroSectionProps) {
  const { t } = useTranslation();
  const { getLanguageFlag } = useLanguagePair();

  return (
    <section className="border-b border-neutral-800/80 bg-gradient-to-b from-neutral-900/60 via-neutral-950 to-neutral-950 px-4 py-8 sm:py-12">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>{t("dictionary.badge")}</span>
              <span className="text-neutral-500">•</span>
              <span>
                {t("dictionary.nativeFrameworkBadge", {
                  framework: frameworkLabel,
                })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <BookA className="size-8 sm:size-10 text-sky-400 shrink-0" />
              <span>{t("dictionary.title")}</span>
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
              {t("dictionary.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-neutral-900 border border-neutral-800 rounded-2xl p-1.5 shadow-sm shrink-0">
            <span className="text-xs font-semibold text-neutral-400 pl-2.5 flex items-center gap-1.5">
              <Globe className="size-3.5 text-neutral-400" />
              <span>{t("common.target")}:</span>
            </span>
            <select
              value={activeLangCode}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-neutral-950 text-white text-xs sm:text-sm font-bold py-1.5 px-3 rounded-xl border border-neutral-800 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
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
        </div>
      </div>
    </section>
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
    <div className="group flex flex-col justify-between rounded-2xl bg-neutral-900/50 border border-neutral-800/80 hover:border-neutral-700 p-5 transition-all shadow-sm hover:shadow-md hover:bg-neutral-900/70">
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {word.lemma}
              </span>
              {word.gender && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-semibold">
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
              className="flex items-center justify-center size-8 rounded-xl bg-neutral-800/80 hover:bg-sky-500/20 text-neutral-300 hover:text-sky-400 transition-colors cursor-pointer"
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
          <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-800/60 text-neutral-400 text-[11px] font-medium uppercase tracking-wider">
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
          <div className="mt-3 pt-3 border-t border-neutral-800/60 space-y-1.5 rounded-xl bg-neutral-950/40 p-3">
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
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default"
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
    <div className="space-y-4 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
          <Input
            type="text"
            placeholder={t("dictionary.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-500 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-sky-500"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="w-full sm:w-auto h-11 px-4 border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl shrink-0 flex items-center gap-2 text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>{t("dictionary.resetFilters")}</span>
          </Button>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-neutral-800/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            {t("dictionary.levelFilter")}
          </span>
          {filterMeta && (
            <span className="text-xs text-neutral-500">
              {t("dictionary.totalWordsCount", {
                count: filterMeta.total_words,
              })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onLevelChange("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              level === "all"
                ? "bg-white text-neutral-950 border-white shadow-sm"
                : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isActive
                    ? "bg-sky-500 text-neutral-950 border-sky-500 shadow-sm"
                    : "bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-sky-500/50 hover:text-white"
                }`}
              >
                <span>{lvl.label}</span>
                {lvl.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      isActive
                        ? "bg-neutral-950/20 text-neutral-950"
                        : "bg-neutral-900 text-neutral-400"
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

      <div className="space-y-2 pt-2 border-t border-neutral-800/50">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
          {t("dictionary.posFilter")}
        </span>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  isActive
                    ? "bg-neutral-100 text-neutral-950 border-white shadow-sm font-bold"
                    : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200"
                }`}
              >
                <span>{t(labelKey)}</span>
                {countMeta && countMeta.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      isActive
                        ? "bg-neutral-950/20 text-neutral-950"
                        : "bg-neutral-900 text-neutral-500"
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
  );
}

function WordsEmptyState({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="py-16 text-center space-y-4 max-w-md mx-auto">
      <div className="size-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
        <BookOpen className="size-8" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-white">
          {t("dictionary.emptyTitle")}
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400">
          {t("dictionary.emptyDesc")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="mt-2 border-neutral-800 bg-neutral-900 text-neutral-200 hover:text-white rounded-xl text-xs cursor-pointer"
      >
        {t("dictionary.resetFilters")}
      </Button>
    </div>
  );
}

interface WordsGridProps {
  activeLangCode: string;
  isLoading: boolean;
  onPlayAudio: (word: WordItem) => void;
  onReset: () => void;
  onSaveFlashcard: (id: number) => void;
  isSaving: boolean;
  playingWordId: number | null;
  wordsData?: WordListResponse;
}

function WordsGrid({
  activeLangCode,
  isLoading,
  onPlayAudio,
  onReset,
  onSaveFlashcard,
  isSaving,
  playingWordId,
  wordsData,
}: WordsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-56 rounded-2xl bg-neutral-900/40 border border-neutral-800/60 p-5 space-y-4 animate-pulse"
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

  if (!wordsData || wordsData.items.length === 0) {
    return <WordsEmptyState onReset={onReset} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {wordsData.items.map((word) => (
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

interface WordsPaginationProps {
  onPageChange: (page: number) => void;
  page: number;
  totalPages: number;
}

function WordsPagination({
  onPageChange,
  page,
  totalPages,
}: WordsPaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3 pt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white rounded-xl text-xs h-10 px-4 disabled:opacity-40 cursor-pointer"
      >
        {t("dictionary.previousPage")}
      </Button>
      <span className="text-xs font-semibold text-neutral-400">
        {t("dictionary.pageOf", {
          page,
          total: totalPages,
        })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white rounded-xl text-xs h-10 px-4 disabled:opacity-40 cursor-pointer"
      >
        {t("dictionary.nextPage")}
      </Button>
    </div>
  );
}

function WordsExplorerComponent() {
  const { lang, level, page, pos, search } = Route.useSearch();
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
            page: 1,
            search: searchInput,
          }),
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, navigate]);

  const { data: wordsData, isLoading } = useWords({
    lang: activeLangCode,
    level: level === "all" ? undefined : level,
    page,
    page_size: 24,
    pos: pos === "all" ? undefined : pos,
    search: search || undefined,
  });

  const { data: filterMeta } = useWordFilters(activeLangCode);
  const saveWordFlashcard = useSaveWordFlashcard();

  const handleLanguageChange = useCallback(
    (newLangCode: string) => {
      navigate({
        search: (prev) => ({
          ...prev,
          lang: newLangCode,
          level: "all",
          page: 1,
          pos: "all",
        }),
      });
    },
    [navigate]
  );

  const handleLevelChange = useCallback(
    (newLevel: string) => {
      navigate({
        search: (prev) => ({ ...prev, level: newLevel, page: 1 }),
      });
    },
    [navigate]
  );

  const handlePosChange = useCallback(
    (newPos: string) => {
      navigate({
        search: (prev) => ({ ...prev, page: 1, pos: newPos }),
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
        page: 1,
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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      <WordsHeroSection
        activeLangCode={activeLangCode}
        frameworkLabel={frameworkLabel}
        languages={languages}
        onLanguageChange={handleLanguageChange}
      />

      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
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
              count: wordsData?.items.length || 0,
              language: currentLanguageName,
              total: wordsData?.total || 0,
            })}
          </span>
          {wordsData && wordsData.total_pages > 1 && (
            <span>
              {t("dictionary.pageOf", {
                page: wordsData.page,
                total: wordsData.total_pages,
              })}
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
          wordsData={wordsData}
        />

        <WordsPagination
          onPageChange={(p) =>
            navigate({
              search: (prev) => ({ ...prev, page: p }),
            })
          }
          page={page}
          totalPages={wordsData?.total_pages || 1}
        />
      </div>
    </main>
  );
}
