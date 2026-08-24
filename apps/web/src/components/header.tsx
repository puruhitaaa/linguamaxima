import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Flame, Globe, GraduationCap, Layers } from "lucide-react";
import { useState } from "react";

import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import { useProgress } from "../lib/queries";
import { GenerateStoryDialog } from "./generate-story-dialog";
import { LanguagePairModal } from "./language-pair-modal";

export default function Header() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { t } = useTranslation();
  const { data: progress } = useProgress();
  const { getLanguageFlag, originLanguage, targetLanguage } = useLanguagePair();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const navLinks = [
    { icon: BookOpen, label: t("header.stories"), to: "/" },
    { icon: Globe, label: t("header.languages"), to: "/languages" },
    { icon: Layers, label: t("header.flashcards"), to: "/flashcards" },
    { icon: GraduationCap, label: t("header.progress"), to: "/progress" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md">
      <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="size-9 rounded-xl bg-sky-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              L
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                LinguaMaxima
              </span>
              <span className="text-[10px] text-neutral-400 font-medium -mt-0.5">
                {t("header.aiReader")}
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ icon: Icon, label, to }) => {
              const isActive =
                to === "/" ? currentPath === "/" : currentPath.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center gap-3">
          {/* Active Language Pair Quick Switcher Badge */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-sky-500/50 hover:bg-neutral-850 text-neutral-200 text-xs font-bold transition-all shadow-sm group"
            title={t("header.quickSwitcherTitle")}
          >
            <span className="text-sm">
              {getLanguageFlag(targetLanguage.code)}
            </span>
            <span className="text-white font-extrabold text-[11px]">
              {targetLanguage.code.toUpperCase()}
            </span>
            <span className="text-neutral-500 font-medium text-[10px]">←</span>
            <span className="text-sm">
              {getLanguageFlag(originLanguage.code)}
            </span>
            <span className="text-neutral-400 font-semibold text-[11px]">
              {originLanguage.code.toUpperCase()}
            </span>
          </button>

          {/* Daily Streak & Due Flashcards */}
          {progress && (
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold"
                title={t("header.streakTooltip")}
              >
                <Flame className="size-3.5 fill-orange-400" />
                <span>
                  {t("header.streakBadge", {
                    days: progress.current_streak_days,
                  })}
                </span>
              </div>
              {progress.flashcards_due_today > 0 && (
                <Link
                  to="/flashcards"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-colors"
                  title={t("header.dueTooltip")}
                >
                  <Layers className="size-3.5" />
                  <span>
                    {t("header.dueBadge", {
                      count: progress.flashcards_due_today,
                    })}
                  </span>
                </Link>
              )}
            </div>
          )}

          {/* Generate Story CTA */}
          <GenerateStoryDialog />
        </div>
      </div>

      <LanguagePairModal
        open={isLangModalOpen}
        onOpenChange={setIsLangModalOpen}
      />
    </header>
  );
}
