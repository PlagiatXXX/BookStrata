// src/ui/Header.spec.tsx
// Дропдаун «Рейтинги»: пункт «Все авторы» ведёт на /authors (перелинковка)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { Header } from "./Header";

vi.mock("@/hooks/useAuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useBookshelf", () => ({ useBookshelf: vi.fn() }));
vi.mock("@/hooks/useAmbientSound", () => ({
  useAmbientSound: vi.fn(() => ({
    isPlaying: false,
    category: null,
    toggle: vi.fn(),
  })),
}));
vi.mock("@/components/SearchBar/SearchBar", () => ({ SearchBar: () => null }));
vi.mock("./Logo", () => ({ Logo: () => null }));
vi.mock("./CoffeeCup", () => ({ CoffeeCup: () => null }));
vi.mock("@/components/Avatar", () => ({ Avatar: () => null }));
vi.mock("./ConfirmModal", () => ({ ConfirmModal: () => null }));

import { useAuth } from "@/hooks/useAuthContext";
import { useBookshelf } from "@/hooks/useBookshelf";

function LocationSpy() {
  return <span data-testid="location-path">{useLocation().pathname}</span>;
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <LocationSpy />
      <Header />
    </MemoryRouter>,
  );
}

describe("Header — дропдаун «Рейтинги»", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useBookshelf).mockReturnValue({
      totalCount: 0,
    } as unknown as ReturnType<typeof useBookshelf>);
  });

  it("пункт «Все авторы» ведёт на /authors", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: "Рейтинги" }));
    await user.click(screen.getByRole("button", { name: "Все авторы" }));

    expect(screen.getByTestId("location-path").textContent).toBe("/authors");
  });
});
