// src/ui/Header.spec.tsx
// Дропдаун «Рейтинги»: пункт «Все авторы» ведёт на /authors (перелинковка)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
vi.mock("./ConfirmModal", () => ({
  ConfirmModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="logout-modal" /> : null,
}));

import { useAuth } from "@/hooks/useAuthContext";
import { useBookshelf } from "@/hooks/useBookshelf";

function LocationSpy() {
  return <span data-testid="location-path">{useLocation().pathname}</span>;
}

function renderHeader(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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

describe("Header — «Полка» и «Угостить» выделены в кнопки правой секции", () => {
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

  it("обе кнопки находятся вне <nav> и в одном контейнере правой секции", () => {
    renderHeader();

    const nav = screen.getByRole("navigation");
    const shelf = screen.getByRole("button", { name: /Полка/ });
    const treat = screen.getByRole("button", { name: /Угостить/ });

    expect(nav).not.toContain(shelf);
    expect(nav).not.toContain(treat);
    expect(shelf.parentElement).toBe(treat.parentElement);
    expect(shelf.parentElement).not.toBe(nav);
  });

  it("в навигации отображаются ссылки: Главная, Тир-листы, Рейтинги, Книжный ДНК, Новости", () => {
    renderHeader();

    const nav = screen.getByRole("navigation");
    const labels = [...nav.querySelectorAll("button")].map(
      (b) => b.textContent ?? "",
    );

    expect(labels).toHaveLength(5);
    expect(labels.join(" ")).toContain("Главная");
    expect(labels.join(" ")).toContain("Тир-листы");
    expect(labels.join(" ")).toContain("Рейтинги");
    expect(labels.join(" ")).toContain("Книжный ДНК");
    expect(labels.join(" ")).toContain("Новости");
  });

  it("пункт «Книжный ДНК» для обычных пользователей и гостей имеет бейдж «Новинка» и ведёт на /reading-dna (десктоп и мобайл)", async () => {
    const user = userEvent.setup();
    renderHeader();

    const dnaBtns = screen.getAllByRole("button", { name: /Книжный ДНК/i });
    expect(dnaBtns.length).toBe(2);
    for (const btn of dnaBtns) {
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent("Новинка");
      expect(btn).not.toBeDisabled();
    }

    await user.click(dnaBtns[0]);
    expect(screen.getByTestId("location-path").textContent).toBe("/reading-dna");
  });

  it("пункт «Книжный ДНК» в мобильном хедере ведёт на /reading-dna", async () => {
    const user = userEvent.setup();
    renderHeader();

    const dnaBtns = screen.getAllByRole("button", { name: /Книжный ДНК/i });
    await user.click(dnaBtns[1]);
    expect(screen.getByTestId("location-path").textContent).toBe("/reading-dna");
  });
});

describe("Header — меню аватара", () => {
  const triggerName = /меню пользователя/i;

  function renderAuthenticated(role = "user", initialEntry = "/") {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { userId: 42, username: "reader", role },
      isLoading: false,
      logout: vi.fn(),
      refreshUser: vi.fn(),
      loginWithData: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    return renderHeader(initialEntry);
  }

  it("находясь на странице своего профиля, пункт «Мой профиль» скрывается", async () => {
    const user = userEvent.setup();
    renderAuthenticated("user", "/users/42");

    await user.click(screen.getByRole("button", { name: triggerName }));

    expect(
      screen.queryByRole("menuitem", { name: "Мой профиль" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Выйти" }),
    ).toBeInTheDocument();
  });

  it("аватар открывает меню с aria-haspopup/aria-expanded и не ведёт на /profile", async () => {
    const user = userEvent.setup();
    renderAuthenticated();

    const trigger = screen.getByRole("button", { name: triggerName });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByTestId("location-path").textContent).toBe("/");
  });

  it("меню обычного пользователя: «Мой профиль», «Выйти» — без «Админки»", async () => {
    const user = userEvent.setup();
    renderAuthenticated("user");

    await user.click(screen.getByRole("button", { name: triggerName }));

    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Мой профиль",
      "Выйти",
    ]);
    expect(
      screen.queryByRole("menuitem", { name: /админка/i }),
    ).not.toBeInTheDocument();
  });

  it("«Админка» доступна администратору", async () => {
    const user = userEvent.setup();
    renderAuthenticated("admin");

    await user.click(screen.getByRole("button", { name: triggerName }));

    expect(
      screen.getByRole("menuitem", { name: "Админка" }),
    ).toBeInTheDocument();
  });

  it("«Админка» доступна модератору", async () => {
    const user = userEvent.setup();
    renderAuthenticated("moderator");

    await user.click(screen.getByRole("button", { name: triggerName }));

    expect(
      screen.getByRole("menuitem", { name: "Админка" }),
    ).toBeInTheDocument();
  });

  it("«Мой профиль» ведёт на /users/:id", async () => {
    const user = userEvent.setup();
    renderAuthenticated();
    const trigger = screen.getByRole("button", { name: triggerName });

    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Мой профиль" }));
    expect(screen.getByTestId("location-path").textContent).toBe("/users/42");
  });

  it("«Админка» ведёт на /admin", async () => {
    const user = userEvent.setup();
    renderAuthenticated("admin");

    await user.click(screen.getByRole("button", { name: triggerName }));
    await user.click(screen.getByRole("menuitem", { name: "Админка" }));

    expect(screen.getByTestId("location-path").textContent).toBe("/admin");
  });

  it("«Выйти» открывает подтверждение выхода и закрывает меню", async () => {
    const user = userEvent.setup();
    renderAuthenticated();

    await user.click(screen.getByRole("button", { name: triggerName }));
    await user.click(screen.getByRole("menuitem", { name: "Выйти" }));

    expect(screen.getByTestId("logout-modal")).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Esc закрывает меню", async () => {
    const user = userEvent.setup();
    renderAuthenticated();
    const trigger = screen.getByRole("button", { name: triggerName });

    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("клик вне меню закрывает его", async () => {
    const user = userEvent.setup();
    renderAuthenticated();

    await user.click(screen.getByRole("button", { name: triggerName }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("стрелки и Home/End перемещают фокус, Enter активирует пункт, Esc возвращает фокус", async () => {
    const user = userEvent.setup();
    renderAuthenticated("admin");
    const trigger = screen.getByRole("button", { name: triggerName });

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const items = await waitFor(() => screen.getAllByRole("menuitem"));
    expect(items).toHaveLength(3);
    await waitFor(() => expect(items[0]).toHaveFocus());

    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1], { key: "ArrowUp" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0], { key: "End" });
    expect(items[2]).toHaveFocus();
    fireEvent.keyDown(items[2], { key: "Home" });
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("location-path").textContent).toBe("/admin");

    await user.click(trigger);
    const reopened = screen.getAllByRole("menuitem");
    fireEvent.keyDown(reopened[0], { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
