import { Button } from "@linguamaxima/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Cpu,
  ExternalLink,
  GitBranch,
  Globe,
  Heart,
  Layers,
  Scale,
  Sparkles,
  Volume2,
} from "lucide-react";

import { useTranslation } from "../lib/i18n";

export const Route = createFileRoute("/about")({
  component: AboutPageComponent,
});

export function GitHubIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function AboutPageComponent() {
  const { t } = useTranslation();

  const licensePermissions = [
    t("about.licenseCommercial"),
    t("about.licenseModification"),
    t("about.licenseDistribution"),
    t("about.licensePrivateUse"),
  ];

  const featurePillars = [
    {
      description: t("about.feat1Desc"),
      icon: Globe,
      title: t("about.feat1Title"),
    },
    {
      description: t("about.feat2Desc"),
      icon: Sparkles,
      title: t("about.feat2Title"),
    },
    {
      description: t("about.feat3Desc"),
      icon: Volume2,
      title: t("about.feat3Title"),
    },
    {
      description: t("about.feat4Desc"),
      icon: Layers,
      title: t("about.feat4Title"),
    },
  ];

  const techStack = [
    { label: "Frontend", value: t("about.frontendTech") },
    { label: "Backend", value: t("about.backendTech") },
    { label: "AI & Neural Audio", value: t("about.aiTech") },
    { label: "Quality & Styles", value: t("about.stylingTech") },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-12 pb-24">
      {/* Hero Header */}
      <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
          <Heart className="size-3.5 fill-sky-400/20" />
          <span>{t("about.badge")}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          {t("about.title")}
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 leading-relaxed max-w-2xl mx-auto">
          {t("about.subtitle")}
        </p>
      </section>

      {/* Creator & Open Source Hero Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="size-12 sm:size-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg shadow-sky-500/20 shrink-0">
                B
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {t("about.authorName")}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-sky-400 font-semibold border border-neutral-700">
                    {t("about.authorHandle")}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {t("about.authorSectionTitle")}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {t("about.authorBio")}
            </p>

            {/* Creator Social / GitHub CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="https://github.com/puruhitaaa"
                target="_blank"
                rel="noreferrer"
                className="inline-flex"
              >
                <Button className="bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs gap-2 shadow-md">
                  <GitHubIcon className="size-4" />
                  <span>{t("about.githubProfileBtn")}</span>
                  <ExternalLink className="size-3 opacity-60 ml-0.5" />
                </Button>
              </a>

              <a
                href="https://github.com/puruhitaaa/linguamaxima"
                target="_blank"
                rel="noreferrer"
                className="inline-flex"
              >
                <Button
                  variant="outline"
                  className="border-neutral-700 bg-neutral-900/80 text-neutral-200 hover:text-white hover:bg-neutral-800 text-xs gap-2"
                >
                  <GitBranch className="size-4 text-sky-400" />
                  <span>{t("about.githubRepoBtn")}</span>
                  <ExternalLink className="size-3 opacity-60 ml-0.5" />
                </Button>
              </a>
            </div>
          </div>

          {/* Open Source & License Mini-Badge Widget */}
          <div className="w-full md:w-auto p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/90 space-y-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
              <Scale className="size-4" />
              <span>{t("about.licenseBadge")}</span>
            </div>
            <div className="space-y-1.5 text-xs text-neutral-300">
              {licensePermissions.map((perm) => (
                <div key={perm} className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Philosophy */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="size-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <BookOpen className="size-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {t("about.missionTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              {t("about.missionDesc")}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Scale className="size-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {t("about.licenseTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              {t("about.licenseDesc")}
            </p>
          </div>
        </div>
      </section>

      {/* Core Architectural Highlights */}
      <section className="space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {t("about.featuresTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400">
            {t("about.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featurePillars.map(({ description, icon: Icon, title }) => (
            <div
              key={title}
              className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800/80 space-y-3 hover:border-neutral-700 transition-colors"
            >
              <div className="size-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Icon className="size-4.5" />
              </div>
              <h4 className="text-sm font-bold text-white">{title}</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Full-Stack Tech Stack Architecture */}
      <section className="p-6 sm:p-8 rounded-3xl bg-neutral-900/30 border border-neutral-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
              <Cpu className="size-4" />
              <span>{t("about.architectureTitle")}</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {t("about.architectureTitle")}
            </h3>
          </div>
          <p className="text-xs text-neutral-400 max-w-sm">
            {t("about.architectureDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {techStack.map((tech) => (
            <div
              key={tech.label}
              className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-850 space-y-1"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Code2 className="size-3.5" />
                <span>{tech.label}</span>
              </div>
              <div className="text-xs font-medium text-neutral-200">
                {tech.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Action / CTA Card */}
      <section className="p-8 rounded-3xl bg-gradient-to-r from-sky-950/30 via-neutral-900 to-neutral-950 border border-neutral-800 text-center space-y-5">
        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {t("about.title")}
          </h3>
          <p className="text-xs text-neutral-400">{t("about.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button className="bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs gap-2 shadow-lg shadow-sky-500/20">
              <BookOpen className="size-4" />
              <span>{t("about.exploreStoriesBtn")}</span>
              <ArrowRight className="size-3.5 ml-0.5" />
            </Button>
          </Link>

          <a
            href="https://github.com/puruhitaaa"
            target="_blank"
            rel="noreferrer"
            className="inline-flex"
          >
            <Button
              variant="outline"
              className="border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 text-xs gap-2"
            >
              <GitHubIcon className="size-4" />
              <span>{t("about.starOnGithubBtn")}</span>
              <ExternalLink className="size-3 opacity-60 ml-0.5" />
            </Button>
          </a>
        </div>
      </section>
    </div>
  );
}
