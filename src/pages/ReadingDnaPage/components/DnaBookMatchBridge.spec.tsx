import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DnaBookMatchBridge } from "./DnaBookMatchBridge";

const mocks = vi.hoisted(() => ({
  getMatchedBooks: vi.fn(),
}));

vi.mock("@/lib/matchApi", () => ({
  getMatchedBooks: mocks.getMatchedBooks,
  matchedBooksKey: (mood: any, limit: number) => ["matchedBooks", mood, limit],
}));

describe("DnaBookMatchBridge", () => {
  const axes = {
    storyFocus: 80,
    emotionalWeight: 75,
    pace: 60,
    darkness: 70,
    scope: 85,
    complexity: 90,
  };

  function renderComponent(onOpenBukstrazh = vi.fn()) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DnaBookMatchBridge
            axes={axes}
            theme="craft"
            onOpenBukstrazh={onOpenBukstrazh}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it("рендерит заголовок и кнопку открытия Букстража", async () => {
    const user = userEvent.setup();
    const handleOpen = vi.fn();
    mocks.getMatchedBooks.mockResolvedValue([]);

    renderComponent(handleOpen);

    expect(screen.getByText(/Book Match · По твоему ДНК/i)).toBeInTheDocument();
    expect(screen.getByText(/3 книги с максимальным совпадением/i)).toBeInTheDocument();

    const bukstrazhBtn = screen.getByRole("button", { name: /Обсудить ДНК с Букстражем/i });
    await user.click(bukstrazhBtn);
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it("рендерит список совпавших книг при успешной загрузке", async () => {
    mocks.getMatchedBooks.mockResolvedValue([
      {
        id: 1,
        slug: "imya-rozy",
        title: "Имя розы",
        author: "Умберто Эко",
        score: 95,
        coverImageUrl: null,
      },
      {
        id: 2,
        slug: "master-i-margarita",
        title: "Мастер и Маргарита",
        author: "Михаил Булгаков",
        score: 88,
        coverImageUrl: null,
      },
    ]);

    renderComponent();

    expect(await screen.findByText("Имя розы")).toBeInTheDocument();
    expect(screen.getByText("Умберто Эко")).toBeInTheDocument();
    expect(screen.getByText("95% совпадение")).toBeInTheDocument();
    expect(screen.getByText("Мастер и Маргарита")).toBeInTheDocument();
  });
});
