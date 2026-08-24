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
import { LanguagePairProvider } from "../lib/language-context";

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
        title: "LinguaMaxima — AI-Powered Multi-Language Reader",
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  return (
    <html className="dark" lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-black font-sans text-white antialiased selection:bg-sky-500/30 selection:text-sky-200">
        <QueryClientProvider client={queryClient}>
          <LanguagePairProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                <Outlet />
              </main>
            </div>
            <Toaster position="top-right" richColors />
            <TanStackRouterDevtools position="bottom-left" />
          </LanguagePairProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
