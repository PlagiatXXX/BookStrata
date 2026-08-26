import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelCard } from "./LevelCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/achievementApi", () => ({
  apiGetMyAchievementStatus: vi.fn().mockResolvedValue({
    xp: 2205,
    title: "Библиотечный волк",
    icon: "🐺",
  }),
}));

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("LevelCard", () => {
  it("показывает уровень, звание и XP до следующего уровня", async () => {
    renderWithClient(<LevelCard />);
    expect(await screen.findByText("Уровень 23")).toBeInTheDocument();
    expect(screen.getByText(/Библиотечный волк/)).toBeInTheDocument();
    expect(screen.getByText(/2205 XP/)).toBeInTheDocument();
    expect(screen.getByText(/95 XP до уровня 24/)).toBeInTheDocument();
  });
});
