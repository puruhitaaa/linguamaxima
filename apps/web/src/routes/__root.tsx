import { Toaster } from "@linguamaxima/ui/components/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "../components/header";
import { LanguagePairProvider, useLanguagePair } from "../lib/language-context";

import appCss from "../index.css?url";

export type RouterAppContext = Record<string, never>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    links: [
      {
        href: "/favicon.ico",
        rel: "icon",
        sizes: "32x32",
      },
      {
        href: "/favicon.svg",
        rel: "icon",
        type: "image/svg+xml",
      },
      {
        href: "/favicon-32x32.png",
        rel: "icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        href: "/favicon-16x16.png",
        rel: "icon",
        sizes: "16x16",
        type: "image/png",
      },
      {
        href: "/apple-touch-icon.png",
        rel: "apple-touch-icon",
        sizes: "180x180",
      },
      {
        href: "/site.webmanifest",
        rel: "manifest",
      },
      {
        href: "https://fonts.googleapis.com",
        rel: "preconnect",
      },
      {
        crossOrigin: "anonymous",
        href: "https://fonts.gstatic.com",
        rel: "preconnect",
      },
      {
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
        rel: "stylesheet",
      },
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        content: "#0ea5e9",
        name: "theme-color",
      },
      {
        title: "LinguaMaxima — AI-Powered Multi-Language Reader",
      },
      {
        content:
          "Master languages through AI-generated parallel bilingual stories and smart spaced-repetition flashcards.",
        name: "description",
      },
      {
        content: "LinguaMaxima — AI-Powered Multi-Language Reader",
        property: "og:title",
      },
      {
        content:
          "Master languages through AI-generated parallel bilingual stories and smart spaced-repetition flashcards.",
        property: "og:description",
      },
      {
        content: "website",
        property: "og:type",
      },
      {
        content: "https://linguamaxima-web.vercel.app",
        property: "og:url",
      },
      {
        content: "https://linguamaxima-web.vercel.app/og-image.png",
        property: "og:image",
      },
      {
        content: "1200",
        property: "og:image:width",
      },
      {
        content: "630",
        property: "og:image:height",
      },
      {
        content: "image/png",
        property: "og:image:type",
      },
      {
        content:
          "LinguaMaxima — AI-Powered Multi-Language Reader & Spaced Repetition Platform",
        property: "og:image:alt",
      },
      {
        content: "summary_large_image",
        name: "twitter:card",
      },
      {
        content: "LinguaMaxima — AI-Powered Multi-Language Reader",
        name: "twitter:title",
      },
      {
        content:
          "Master languages through AI-generated parallel bilingual stories and smart spaced-repetition flashcards.",
        name: "twitter:description",
      },
      {
        content: "https://linguamaxima-web.vercel.app/og-image.png",
        name: "twitter:image",
      },
      {
        content:
          "LinguaMaxima — AI-Powered Multi-Language Reader & Spaced Repetition Platform",
        name: "twitter:image:alt",
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguagePairProvider>
        <DocumentShell />
      </LanguagePairProvider>
    </QueryClientProvider>
  );
}

function DocumentShell() {
  const { originLanguage } = useLanguagePair();

  return (
    <html className="dark" lang={originLanguage?.code || "en"}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-sky-500/30 selection:text-sky-200">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
        <Toaster position="top-right" richColors />
        {import.meta.env.DEV ? (
          <TanStackRouterDevtools position="bottom-left" />
        ) : null}
        <Scripts />
      </body>
    </html>
  );
}
