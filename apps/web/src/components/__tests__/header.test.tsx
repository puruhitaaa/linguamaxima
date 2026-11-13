import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../lib/api";
import { LanguagePairProvider } from "../../lib/language-context";
import Header from "../header";

let mockPathname = "/";
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useRouterState: () => ({ location: { pathname: mockPathname } }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

function installMockResizeObserver() {
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
}

function renderHeader({
  innerWidth,
  overflows,
  pathname = "/",
}: {
  innerWidth: number;
  overflows: boolean;
  pathname?: string;
}) {
  mockPathname = pathname;
  installMockResizeObserver();
  localStorage.setItem("linguamaxima_origin_lang", "en");
  localStorage.setItem("linguamaxima_target_lang", "de");
  vi.spyOn(api, "getLanguages").mockResolvedValue([]);
  vi.spyOn(api, "getProgress").mockResolvedValue({
    average_quiz_score: 85,
    current_streak_days: 3,
    flashcards_due_today: 4,
    total_stories_available: 10,
    total_stories_read: 2,
    total_words_learned: 12,
  });

  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      if ((this as HTMLElement).classList.contains("header-inner")) {
        return innerWidth;
      }
      return 120;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get() {
      if ((this as HTMLElement).classList.contains("header-inner")) {
        return overflows ? innerWidth + 120 : innerWidth - 40;
      }
      return 120;
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguagePairProvider>
        <Header />
      </LanguagePairProvider>
    </QueryClientProvider>
  );
}

describe("Header", () => {
  beforeEach(() => {
    mockPathname = "/";
    mockNavigate.mockReset();
  });

  it("renders inline wide navigation without popover when links fit", () => {
    const { container } = renderHeader({
      innerWidth: 1280,
      overflows: false,
      pathname: "/journeys",
    });

    const header = container.querySelector("header.site-header");
    const menu = container.querySelector("ul.site-menu");

    expect(header?.classList.contains("is-wide")).toBe(true);
    expect(menu?.hasAttribute("popover")).toBe(false);

    const activeLink = screen.getByRole("link", { name: "Journeys" });
    expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  it("collapses into popover navigation when inline row overflows", () => {
    const { container } = renderHeader({
      innerWidth: 960,
      overflows: true,
      pathname: "/",
    });

    const header = container.querySelector("header.site-header");
    const menu = container.querySelector("ul.site-menu");
    const menuButton = screen.getByRole("button", { name: "Menu" });

    expect(header?.classList.contains("is-wide")).toBe(false);
    expect(menu?.getAttribute("popover")).toBe("auto");
    expect(menuButton).toHaveAttribute("aria-controls", menu?.id ?? "");
  });
});
