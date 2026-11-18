import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("sileo", () => ({
  sileo: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/tierListApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tierListApi")>();
  return {
    ...actual,
    updateTierListTheme: vi.fn().mockResolvedValue({}),
  };
});

import { ThemePicker } from "./ThemePicker";

describe("ThemePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Обычный режим (currentTheme = 'default')", () => {
    it("отображает линейки 'Стиль' и 'Цветовая тема', а также кнопку перехода к сезонным темам", async () => {
      const onThemeChanged = vi.fn();
      render(
        <ThemePicker
          tierListId="tl-1"
          currentTheme="default"
          onThemeChanged={onThemeChanged}
          isAdmin={true}
        />,
      );

      expect(screen.getByText("Стиль")).toBeInTheDocument();
      expect(screen.getByText("Цветовая тема")).toBeInTheDocument();
      expect(screen.getByText("Классическая")).toBeInTheDocument();

      const seasonalBtn = screen.getByRole("button", {
        name: /сезонные темы/i,
      });
      expect(seasonalBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(seasonalBtn);
      });
      expect(onThemeChanged).toHaveBeenCalledWith("autumn-leaves");
    });

    it("для не-админа кнопка сезонных тем открывает доступную тему 'autumn-rain'", async () => {
      const onThemeChanged = vi.fn();
      render(
        <ThemePicker
          tierListId="tl-1"
          currentTheme="default"
          onThemeChanged={onThemeChanged}
          isAdmin={false}
        />,
      );

      const seasonalBtn = screen.getByRole("button", {
        name: /сезонные темы/i,
      });
      await act(async () => {
        fireEvent.click(seasonalBtn);
      });
      expect(onThemeChanged).toHaveBeenCalledWith("autumn-rain");
    });
  });

  describe("Сезонный режим (currentTheme = 'autumn-leaves')", () => {
    it("скрывает 'Стиль', 'Цветовая тема' и тему 'Классическая'", () => {
      render(
        <ThemePicker
          tierListId="tl-1"
          currentTheme="autumn-leaves"
          onThemeChanged={vi.fn()}
        />,
      );

      expect(screen.queryByText("Стиль")).toBeNull();
      expect(screen.queryByText("Цветовая тема")).toBeNull();
      expect(screen.queryByText("Классическая")).toBeNull();
    });

    it("отображает сезонные темы и блокирует 'Золотой листопад' и 'Новогодняя сказка' для не-админов", () => {
      render(
        <ThemePicker
          tierListId="tl-1"
          currentTheme="autumn-rain"
          onThemeChanged={vi.fn()}
          isAdmin={false}
        />,
      );

      expect(screen.getByText("Золотой листопад")).toBeInTheDocument();
      expect(screen.getByText("Осенний дождь")).toBeInTheDocument();
      expect(screen.getByText("Морозные узоры")).toBeInTheDocument();
      expect(screen.getByText("Северное сияние")).toBeInTheDocument();
      expect(screen.getByText("Новогодняя сказка")).toBeInTheDocument();

      const leavesBtn = screen.getByRole("button", { name: /золотой листопад/i });
      const newYearBtn = screen.getByRole("button", { name: /новогодняя сказка/i });
      const rainBtn = screen.getByRole("button", { name: /осенний дождь/i });

      expect(leavesBtn).toBeDisabled();
      expect(leavesBtn).toHaveAttribute("aria-disabled", "true");
      expect(newYearBtn).toBeDisabled();
      expect(newYearBtn).toHaveAttribute("aria-disabled", "true");
      expect(rainBtn).not.toBeDisabled();
    });

    it("кнопка 'Классические темы' переключает на тему 'default'", async () => {
      const onThemeChanged = vi.fn();
      render(
        <ThemePicker
          tierListId="tl-1"
          currentTheme="autumn-leaves"
          onThemeChanged={onThemeChanged}
        />,
      );

      const classicBtn = screen.getByRole("button", {
        name: /классические темы/i,
      });
      await act(async () => {
        fireEvent.click(classicBtn);
      });

      expect(onThemeChanged).toHaveBeenCalledWith("default");
    });

    it("кнопка 'Эффекты' переключает состояние и диспатчит событие", () => {
      const onToggleEffects = vi.fn();
      const eventListener = vi.fn();
      window.addEventListener("seasonal-effects-toggle", eventListener);

      render(
        <ThemePicker
          tierListId="tl-1"
          currentTheme="autumn-leaves"
          onThemeChanged={vi.fn()}
          onToggleEffects={onToggleEffects}
        />,
      );

      const effectsBtn = screen.getByRole("button", { name: /эффекты: вкл/i });
      expect(effectsBtn).toBeInTheDocument();

      fireEvent.click(effectsBtn);

      expect(localStorage.getItem("bookstrata_seasonal_effects")).toBe("false");
      expect(onToggleEffects).toHaveBeenCalledWith(false);
      expect(screen.getByRole("button", { name: /эффекты: выкл/i })).toBeInTheDocument();
      expect(eventListener).toHaveBeenCalled();

      window.removeEventListener("seasonal-effects-toggle", eventListener);
    });
  });
});
