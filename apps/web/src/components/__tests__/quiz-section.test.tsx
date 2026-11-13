import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { api } from "../../lib/api";
import { LanguagePairProvider } from "../../lib/language-context";
import type { QuizQuestion } from "../../types/api";
import { QuizSection } from "../quiz-section";

function renderQuiz(quizzes: QuizQuestion[]) {
  localStorage.setItem("linguamaxima_origin_lang", "en");
  vi.spyOn(api, "getLanguages").mockResolvedValue([]);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguagePairProvider>
        <QuizSection storyId={42} quizzes={quizzes} />
      </LanguagePairProvider>
    </QueryClientProvider>
  );
}

const SAMPLE_QUIZZES: QuizQuestion[] = [
  {
    id: 1,
    options: ["Berlin", "Munich", "Hamburg"],
    question: "Where is the station?",
    question_type: "comprehension",
    sort_order: 1,
    story_id: 42,
  },
];

describe("QuizSection", () => {
  it("shows an error alert instead of a fake 100% score when submission fails", async () => {
    vi.spyOn(api, "submitQuiz").mockRejectedValueOnce(
      new Error("Server unavailable")
    );
    renderQuiz(SAMPLE_QUIZZES);

    fireEvent.click(screen.getByText("Berlin"));
    fireEvent.click(screen.getByRole("button", { name: /Submit Quiz/iu }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Server unavailable");
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
  });

  it("checks the answer inline via API and shows green/red feedback", async () => {
    const checkSpy = vi.spyOn(api, "checkQuizAnswer").mockResolvedValueOnce({
      correct_answer: "Munich",
      explanation: "The narrator travels to Munich.",
      is_correct: false,
      question: "Where is the station?",
      question_id: 1,
      selected_answer: "Berlin",
    });

    renderQuiz(SAMPLE_QUIZZES);

    fireEvent.click(screen.getByText("Berlin"));
    fireEvent.click(screen.getByRole("button", { name: /Check Answer/iu }));

    await waitFor(() => {
      expect(checkSpy).toHaveBeenCalledWith(42, {
        question_id: 1,
        selected_answer: "Berlin",
      });
    });

    expect(
      await screen.findByText(/Correct answer: Munich/iu)
    ).toBeInTheDocument();
    expect(
      screen.getByText("The narrator travels to Munich.")
    ).toBeInTheDocument();
  });
});
