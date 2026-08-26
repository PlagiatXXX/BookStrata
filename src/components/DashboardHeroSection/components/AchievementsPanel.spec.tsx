import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AchievementsPanel } from "./AchievementsPanel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Achievement } from "@/lib/achievementApi";

vi.mock("@/lib/achievementApi", () => ({
  apiGetMyAchievements: vi.fn(),
}));

const earned: Achievement[] = [
  { id: "a1", title: "Собиратель", description: "Создать 1 подборку", iconUrl: "🗂️", xpValue: 20, isEarned: true, earnedAt: "2026-08-01T00:00:00Z", isSecret: false },
];

const locked: Achievement[] = [
  { id: "a2", title: "Библиофил", description: "Добавить 50 книг", iconUrl: "🏛️", xpValue: 100, isEarned: false, earnedAt: null, isSecret: false },
];

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("AchievementsPanel", () => {
  it("показывает заработанные с +XP", async () => {
    const { apiGetMyAchievements } = await import("@/lib/achievementApi");
    vi.mocked(apiGetMyAchievements).mockResolvedValue([...earned, ...locked]);
    renderWithClient(<AchievementsPanel />);
    expect(await screen.findByText("Собиратель")).toBeInTheDocument();
    expect(screen.getByText("+20 XP")).toBeInTheDocument();
    expect(screen.queryByText("Библиофил")).not.toBeInTheDocument();
  });

  it("если заработанных нет — показывает заблокированные серыми", async () => {
    const { apiGetMyAchievements } = await import("@/lib/achievementApi");
    vi.mocked(apiGetMyAchievements).mockResolvedValue(locked);
    renderWithClient(<AchievementsPanel />);
    expect(await screen.findByText("Библиофил")).toBeInTheDocument();
    expect(screen.queryByText(/\+100 XP/)).not.toBeInTheDocument();
  });
});
