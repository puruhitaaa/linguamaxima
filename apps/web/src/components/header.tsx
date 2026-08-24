import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Flame, GraduationCap, Layers } from "lucide-react";

import { useProgress } from "../lib/queries";
import { GenerateStoryDialog } from "./generate-story-dialog";

export default function Header() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { data: progress } = useProgress();

  const navLinks = [
    { to: "/", label: "Stories", icon: BookOpen },
    { to: "/flashcards", label: "Flashcards", icon: Layers },
    { to: "/progress", label: "Progress", icon: GraduationCap },
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
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  DE • ID
                </span>
              </span>
              <span className="text-[10px] text-neutral-400 font-medium -mt-0.5">
                AI German Reader
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
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
          {/* Daily Streak & Due Flashcards */}
          {progress && (
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold"
                title="Daily streak"
              >
                <Flame className="size-3.5 fill-orange-400" />
                <span>{progress.current_streak_days}d streak</span>
              </div>
              {progress.flashcards_due_today > 0 && (
                <Link
                  to="/flashcards"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-colors"
                >
                  <Layers className="size-3.5" />
                  <span>{progress.flashcards_due_today} due</span>
                </Link>
              )}
            </div>
          )}

          {/* Generate Story CTA */}
          <GenerateStoryDialog />
        </div>
      </div>
    </header>
  );
}
