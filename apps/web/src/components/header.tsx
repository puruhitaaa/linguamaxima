import { Button } from "@linguamaxima/ui/components/button";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookA,
  BookOpen,
  Compass,
  Flame,
  Globe,
  GraduationCap,
  Info,
  Layers,
  Menu,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";

import { useTranslation } from "../lib/i18n";
import { useLanguagePair } from "../lib/language-context";
import { useProgress } from "../lib/queries";
import { GitHubIcon } from "../routes/about";
import type { ProgressSummary } from "../types/api";
import { GenerateStoryDialog } from "./generate-story-dialog";
import { LanguagePairModal } from "./language-pair-modal";
import { LearningJourneyModal } from "./learning-journey-modal";

function isPopoverCurrentlyOpen(menu: HTMLElement, supportsPopover: boolean) {
  if (supportsPopover) {
    try {
      return menu.matches(":popover-open");
    } catch {
      return false;
    }
  }
  return menu.classList.contains(":popover-open");
}

function useResponsiveHeaderLayout({
  actionsRef,
  depsKey,
  headerRef,
  innerRef,
  menuRef,
}: {
  actionsRef: React.RefObject<HTMLDivElement | null>;
  depsKey: string;
  headerRef: React.RefObject<HTMLElement | null>;
  innerRef: React.RefObject<HTMLDivElement | null>;
  menuRef: React.RefObject<HTMLUListElement | null>;
}) {
  useEffect(() => {
    const header = headerRef.current;
    const inner = innerRef.current;
    const menu = menuRef.current;
    const actions = actionsRef.current;
    if (!(header && inner && menu)) {
      return;
    }

    const supportsPopover =
      typeof HTMLElement !== "undefined" &&
      Object.hasOwn(HTMLElement.prototype, "popover");

    let isWide = false;
    let lastMeasuredWidth = 0;
    let isMeasuring = false;
    let rafId = 0;

    const measure = () => {
      if (isMeasuring) {
        return;
      }
      isMeasuring = true;

      const wasOpen = isPopoverCurrentlyOpen(menu, supportsPopover);
      header.classList.add("is-measuring", "is-wide");
      menu.removeAttribute("popover");

      const currentWidth = inner.clientWidth;
      const fits = inner.scrollWidth <= currentWidth;
      lastMeasuredWidth = currentWidth;
      isWide = fits;

      if (fits) {
        menu.classList.remove(":popover-open");
      } else {
        header.classList.remove("is-wide");
        menu.setAttribute("popover", "auto");
        if (wasOpen && supportsPopover) {
          try {
            menu.showPopover();
          } catch {
            // Ignore invalid state errors if popover was disconnected
          }
        }
      }

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        header.classList.remove("is-measuring");
        isMeasuring = false;
      });
    };

    measure();

    const observer = new ResizeObserver((entries) => {
      if (isMeasuring) {
        return;
      }
      const headerWidthChanged = entries.some(
        (entry) => entry.target === inner
      );
      if (isWide) {
        measure();
      } else if (
        headerWidthChanged &&
        (lastMeasuredWidth === 0 || inner.clientWidth > lastMeasuredWidth)
      ) {
        measure();
      }
    });

    observer.observe(inner);
    observer.observe(menu);
    if (actions) {
      observer.observe(actions);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [actionsRef, depsKey, headerRef, innerRef, menuRef]);
}

function PopoverMenuExtras({
  dueBadgeText,
  dueTooltip,
  githubTooltip,
  onClose,
  progress,
  streakBadgeText,
}: {
  dueBadgeText: string;
  dueTooltip: string;
  githubTooltip: string;
  onClose: () => void;
  progress: ProgressSummary | undefined;
  streakBadgeText: string;
}) {
  return (
    <li className="site-menu-extras pt-2 mt-1 border-t border-neutral-800/80 space-y-2">
      {progress && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold flex-1 justify-center">
            <Flame className="size-3.5 fill-orange-400 shrink-0" />
            <span>{streakBadgeText}</span>
          </div>
          {progress.flashcards_due_today > 0 && (
            <Link
              to="/flashcards"
              onClick={onClose}
              title={dueTooltip}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-colors flex-1 justify-center"
            >
              <Layers className="size-3.5 shrink-0" />
              <span>{dueBadgeText}</span>
            </Link>
          )}
        </div>
      )}
      <a
        href="https://github.com/puruhitaaa"
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/70 transition-colors min-h-[40px]"
      >
        <GitHubIcon className="size-4 text-neutral-400 shrink-0" />
        <span>{githubTooltip}</span>
      </a>
    </li>
  );
}

export default function Header() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { t } = useTranslation();
  const { getLanguageFlag, originLanguage, targetLanguage } = useLanguagePair();
  const { data: progress } = useProgress({
    origin_language_code: originLanguage.code,
    target_language_code: targetLanguage.code,
  });
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const layoutDepsKey = [
    originLanguage.code,
    targetLanguage.code,
    progress?.current_streak_days ?? "none",
    progress?.flashcards_due_today ?? 0,
  ].join(":");

  useResponsiveHeaderLayout({
    actionsRef,
    depsKey: layoutDepsKey,
    headerRef,
    innerRef,
    menuRef,
  });

  const navLinks = [
    { icon: BookOpen, label: t("header.stories"), to: "/" },
    { icon: Compass, label: t("header.journeys"), to: "/journeys" },
    { icon: BookA, label: t("header.words"), to: "/words" },
    { icon: Globe, label: t("header.languages"), to: "/languages" },
    { icon: Layers, label: t("header.flashcards"), to: "/flashcards" },
    { icon: GraduationCap, label: t("header.progress"), to: "/progress" },
    { icon: Info, label: t("header.about"), to: "/about" },
  ] as const;

  const closeMenuPopover = () => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }
    menu.classList.remove(":popover-open");
    if (typeof menu.hidePopover === "function") {
      try {
        menu.hidePopover();
      } catch {
        // Ignore if not currently promoted as an open popover
      }
    }
  };

  const handleFallbackMenuToggle = () => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }
    if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
      menu.classList.toggle(":popover-open");
    }
  };

  const streakLabel = progress
    ? t("header.streakBadge", { days: progress.current_streak_days })
    : "";
  const dueLabel = progress
    ? t("header.dueBadge", { count: progress.flashcards_due_today })
    : "";

  return (
    <header
      ref={headerRef}
      className="site-header sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md"
    >
      <div
        ref={innerRef}
        className="header-inner mx-auto max-w-7xl px-3 sm:px-6 h-16 flex items-center gap-2 sm:gap-3"
      >
        {/* Brand */}
        <Link
          to="/"
          onClick={closeMenuPopover}
          className="site-brand flex items-center gap-2 group shrink-0"
          aria-label="LinguaMaxima Home"
        >
          <img
            src="/favicon.svg"
            alt=""
            className="size-8 rounded-xl shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform shrink-0"
            width={32}
            height={32}
          />
          <span className="hidden min-[400px]:inline font-extrabold text-sm sm:text-base tracking-tight text-white">
            LinguaMaxima
          </span>
        </Link>

        {/* Responsive Single-Tree Navigation (inline when wide, popover when narrow) */}
        <nav
          className="site-nav flex items-center"
          aria-label="Main Navigation"
        >
          <button
            type="button"
            popoverTarget={menuId}
            popoverTargetAction="toggle"
            aria-controls={menuId}
            aria-label="Menu"
            onClick={handleFallbackMenuToggle}
            className="site-menu-button flex items-center justify-center size-9 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
          >
            <Menu className="size-5 shrink-0" aria-hidden="true" />
            <span className="sr-only">Menu</span>
          </button>

          <ul
            ref={menuRef}
            id={menuId}
            className="site-menu grid grid-cols-1 gap-1.5 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            {navLinks.map(({ icon: Icon, label, to }) => {
              const isActive =
                to === "/" ? currentPath === "/" : currentPath.startsWith(to);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    aria-current={isActive ? "page" : undefined}
                    onClick={closeMenuPopover}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border border-neutral-800/60 bg-neutral-900/60 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors min-h-[42px]"
                  >
                    <Icon
                      className="site-menu-icon size-4 text-sky-400 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}

            <PopoverMenuExtras
              progress={progress}
              streakBadgeText={streakLabel}
              dueBadgeText={dueLabel}
              dueTooltip={t("header.dueTooltip")}
              githubTooltip={t("header.githubTooltip")}
              onClose={closeMenuPopover}
            />
          </ul>
        </nav>

        {/* Right Utility & Action Cluster */}
        <div
          ref={actionsRef}
          className="header-actions flex items-center gap-1.5 sm:gap-2 shrink-0"
        >
          {/* Active Language Pair Badge */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 h-9 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-sky-500/50 hover:bg-neutral-800/80 text-neutral-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
            title={t("header.quickSwitcherTitle")}
            aria-label={`Language pair: ${originLanguage.name} to ${targetLanguage.name}. Click to change.`}
          >
            <span className="text-xs sm:text-sm" aria-hidden="true">
              {getLanguageFlag(originLanguage.code)}
            </span>
            <span className="text-neutral-400 font-semibold text-[11px] sm:text-xs">
              {originLanguage.code.toUpperCase()}
            </span>
            <span
              className="text-neutral-500 font-medium text-[11px]"
              aria-hidden="true"
            >
              →
            </span>
            <span className="text-xs sm:text-sm" aria-hidden="true">
              {getLanguageFlag(targetLanguage.code)}
            </span>
            <span className="text-white font-extrabold text-[11px] sm:text-xs">
              {targetLanguage.code.toUpperCase()}
            </span>
          </button>

          {/* Compact Streak & Due Flashcards Pills */}
          {progress && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <div
                className="flex items-center gap-1 px-2 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold shrink-0"
                title={`${streakLabel} — ${t("header.streakTooltip")}`}
                aria-label={streakLabel}
              >
                <Flame
                  className="size-3.5 fill-orange-400 shrink-0"
                  aria-hidden="true"
                />
                <span>{progress.current_streak_days}</span>
              </div>

              {progress.flashcards_due_today > 0 && (
                <Link
                  to="/flashcards"
                  className="flex items-center gap-1 px-2 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-colors shrink-0"
                  title={`${dueLabel} — ${t("header.dueTooltip")}`}
                  aria-label={dueLabel}
                >
                  <Layers className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{progress.flashcards_due_today}</span>
                </Link>
              )}
            </div>
          )}

          {/* Learning Journey & Generate Story CTAs */}
          <LearningJourneyModal
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-neutral-900 hover:bg-neutral-800 border-sky-500/40 text-sky-300 hover:text-white font-semibold px-2.5 sm:px-3 h-9 rounded-xl shrink-0 cursor-pointer"
                title={t("header.newJourney")}
                aria-label={t("header.newJourney")}
              >
                <Compass
                  className="size-4 text-sky-400 shrink-0"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline whitespace-nowrap text-xs">
                  {t("header.newJourney")}
                </span>
              </Button>
            }
          />

          <GenerateStoryDialog
            trigger={
              <Button
                size="sm"
                className="gap-1.5 bg-sky-500 hover:bg-sky-600 text-white shadow-sm font-semibold px-2.5 sm:px-3.5 h-9 rounded-xl shrink-0 cursor-pointer"
                title={t("generator.triggerBtn")}
                aria-label={t("generator.triggerBtn")}
              >
                <Sparkles className="size-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline whitespace-nowrap text-xs">
                  {t("generator.triggerBtn")}
                </span>
              </Button>
            }
          />

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() =>
              setTheme(resolvedTheme === "light" ? "dark" : "light")
            }
            className="flex items-center justify-center size-9 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/80 transition-colors cursor-pointer shrink-0"
            title={
              mounted && resolvedTheme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode"
            }
            aria-label="Toggle color theme"
          >
            {mounted && resolvedTheme === "light" ? (
              <Moon className="size-4" aria-hidden="true" />
            ) : (
              <Sun className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <LanguagePairModal
        open={isLangModalOpen}
        onOpenChange={setIsLangModalOpen}
      />
    </header>
  );
}
