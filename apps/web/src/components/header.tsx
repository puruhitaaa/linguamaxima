import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Flame,
  Globe,
  GraduationCap,
  Layers,
  Menu,
  X,
} from "lucide-react";
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navLinks = [
    { icon: BookOpen, label: t("header.stories"), to: "/" },
    { icon: Globe, label: t("header.languages"), to: "/languages" },
    { icon: Layers, label: t("header.flashcards"), to: "/flashcards" },
    { icon: GraduationCap, label: t("header.progress"), to: "/progress" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
      <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand & Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            onClick={() => setIsMobileNavOpen(false)}
            className="flex items-center gap-2.5 group"
            aria-label="LinguaMaxima Home"
          >
            <div className="size-9 rounded-xl bg-sky-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              L
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                LinguaMaxima
              </span>
              <span className="text-xs text-neutral-400 font-medium -mt-0.5">
                {t("header.aiReader")}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main Navigation"
          >
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
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Language Pair Quick Switcher Badge (LTR) */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-sky-500/50 hover:bg-neutral-850 text-neutral-200 text-xs font-bold transition-all shadow-sm group min-h-[36px]"
            title={t("header.quickSwitcherTitle")}
            aria-label={`Language pair: ${originLanguage.name} to ${targetLanguage.name}. Click to change.`}
          >
            <span className="text-sm">
              {getLanguageFlag(originLanguage.code)}
            </span>
            <span className="text-neutral-400 font-semibold text-xs">
              {originLanguage.code.toUpperCase()}
            </span>
            <span className="text-neutral-500 font-medium text-xs">→</span>
            <span className="text-sm">
              {getLanguageFlag(targetLanguage.code)}
            </span>
            <span className="text-white font-extrabold text-xs">
              {targetLanguage.code.toUpperCase()}
            </span>
            <span className="hidden lg:inline-block text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-semibold ml-0.5">
              Learn
            </span>
          </button>

          {/* Daily Streak & Due Flashcards */}
          {progress && (
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold min-h-[36px]"
                title={t("header.streakTooltip")}
                aria-label={`Daily streak: ${progress.current_streak_days} days`}
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-colors min-h-[36px]"
                  title={t("header.dueTooltip")}
                  aria-label={`${progress.flashcards_due_today} flashcards due today`}
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

          {/* Mobile Navigation Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center size-9 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label={isMobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileNavOpen}
          >
            {isMobileNavOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Slide-down Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden border-t border-neutral-800/80 bg-neutral-950/95 px-4 py-3 space-y-3 backdrop-blur-lg animate-in slide-in-from-top-2 duration-200">
          <nav
            className="grid grid-cols-2 gap-2"
            aria-label="Mobile Navigation"
          >
            {navLinks.map(({ icon: Icon, label, to }) => {
              const isActive =
                to === "/" ? currentPath === "/" : currentPath.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors min-h-[44px] ${
                    isActive
                      ? "bg-neutral-800 text-white border border-neutral-700"
                      : "bg-neutral-900/60 text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/60"
                  }`}
                >
                  <Icon className="size-4 text-sky-400" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Streak & Due Badges */}
          {progress && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/60">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold flex-1 justify-center min-h-[40px]">
                <Flame className="size-4 fill-orange-400" />
                <span>
                  {t("header.streakBadge", {
                    days: progress.current_streak_days,
                  })}
                </span>
              </div>
              {progress.flashcards_due_today > 0 && (
                <Link
                  to="/flashcards"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-colors flex-1 justify-center min-h-[40px]"
                >
                  <Layers className="size-4" />
                  <span>
                    {t("header.dueBadge", {
                      count: progress.flashcards_due_today,
                    })}
                  </span>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <LanguagePairModal
        open={isLangModalOpen}
        onOpenChange={setIsLangModalOpen}
      />
    </header>
  );
}
