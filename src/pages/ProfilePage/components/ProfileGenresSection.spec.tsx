// src/pages/ProfilePage/components/ProfileGenresSection.spec.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("@/lib/userApi", () => ({
  apiGetGenrePreferences: vi.fn(),
  apiSetGenrePreferences: vi.fn(),
}));

import { apiGetGenrePreferences, apiSetGenrePreferences } from "@/lib/userApi";
import { ProfileGenresSection } from "./ProfileGenresSection";

const mockGet = vi.mocked(apiGetGenrePreferences);
const mockSet = vi.mocked(apiSetGenrePreferences);

function renderUi() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(QueryClientProvider, { client }, createElement(ProfileGenresSection)),
  );
}

describe("ProfileGenresSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue([]);
    mockSet.mockResolvedValue([]);
  });

  it("рендерит заголовок, группы и все 19 жанров со счётчиком", async () => {
    renderUi();

    expect(await screen.findByText("Любимые жанры")).toBeInTheDocument();
    expect(screen.getByTestId("genre-group-art")).toBeInTheDocument();
    expect(screen.getByTestId("genre-group-detective")).toBeInTheDocument();
    expect(screen.getByTestId("genre-group-nonfiction")).toBeInTheDocument();
    expect(screen.getByTestId("genre-group-kids")).toBeInTheDocument();
    expect(await screen.findByText("0/7")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(19);
  });

  it("кликом добавляет жанр и шлёт мутацию с новым списком", async () => {
    renderUi();

    const chip = await screen.findByRole("button", { name: "Фэнтези" });
    fireEvent.click(chip);

    await waitFor(() => expect(mockSet).toHaveBeenCalledWith(["fantasy"]));
  });

  it("кликом по выбранному снимает жанр", async () => {
    mockGet.mockResolvedValue(["fantasy"]);
    renderUi();

    const chip = await screen.findByRole("button", { name: "Фэнтези" });
    // Ждём прихода данных query: жанр отмечен выбранным
    await waitFor(() => expect(chip).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(chip);

    await waitFor(() => expect(mockSet).toHaveBeenCalledWith([]));
  });

  it("при лимите 7 невыбранные жанры disabled, выбранные — нет", async () => {
    mockGet.mockResolvedValue([
      "fantasy", "sci-fi", "cyberpunk", "romance", "historical", "classics", "thriller",
    ]);
    renderUi();

    // Счётчик отражает загруженные данные — дожидаемся 7/7
    expect(await screen.findByText("7/7")).toBeInTheDocument();
    const selected = screen.getByRole("button", { name: "Фэнтези" });
    expect(selected).toBeEnabled();
    expect(screen.getByRole("button", { name: "Японская литература" })).toBeDisabled();
  });
});
