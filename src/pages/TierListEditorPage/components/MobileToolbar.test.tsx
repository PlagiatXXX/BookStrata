import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Tier } from "@/types";
import { MobileToolbar } from "./MobileToolbar";

vi.mock("@/lib/analyticsApi", () => ({
  apiTrackEvent: vi.fn(),
}));

const tier = (id: string, title: string): Tier => ({
  id,
  title,
  color: "#ff4444",
  bookIds: [],
});

const defaultProps = {
  onSave: vi.fn(),
  saveStatus: "idle" as const,
  lastSaved: null,
  hasUnsavedChanges: false,
  onDownloadImage: vi.fn(),
  isPublic: false,
  isTogglingPublic: false,
};

const setViewport = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
};

describe("MobileToolbar — настройки полки по шестерёнке", () => {
  beforeEach(() => {
    setViewport(390);
  });

  it("на мобильной ширине при появлении activeTier (клик по шестерёнке) панель открывается сразу", () => {
    const { rerender } = render(
      <MobileToolbar {...defaultProps} activeTier={undefined} />,
    );
    expect(screen.queryByText("Высота")).not.toBeInTheDocument();

    rerender(
      <MobileToolbar
        {...defaultProps}
        activeTier={tier("tier-1", "S")}
        onUpdateTier={vi.fn()}
      />,
    );

    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("Высота")).toBeInTheDocument();
  });

  it("при смене activeTier панель переключается на другую полку", () => {
    const { rerender } = render(
      <MobileToolbar
        {...defaultProps}
        activeTier={tier("tier-1", "S")}
        onUpdateTier={vi.fn()}
      />,
    );
    rerender(
      <MobileToolbar
        {...defaultProps}
        activeTier={tier("tier-2", "A")}
        onUpdateTier={vi.fn()}
      />,
    );

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByText("S")).not.toBeInTheDocument();
  });

  it("клик вне панели снимает активность полки (onDeactivateTier) и закрывает панель", async () => {
    const onDeactivateTier = vi.fn();
    const { rerender } = render(
      <MobileToolbar {...defaultProps} activeTier={undefined} />,
    );
    rerender(
      <MobileToolbar
        {...defaultProps}
        activeTier={tier("tier-1", "S")}
        onUpdateTier={vi.fn()}
        onDeactivateTier={onDeactivateTier}
      />,
    );
    expect(screen.getByText("Высота")).toBeInTheDocument();

    // Клик вне (listener регистрируется через setTimeout 0)
    await new Promise((r) => setTimeout(r, 10));
    fireEvent.click(document.body);

    expect(onDeactivateTier).toHaveBeenCalledTimes(1);
  });

  it("клик внутри панели не снимает активность", async () => {
    const onDeactivateTier = vi.fn();
    const { rerender } = render(
      <MobileToolbar {...defaultProps} activeTier={undefined} />,
    );
    rerender(
      <MobileToolbar
        {...defaultProps}
        activeTier={tier("tier-1", "S")}
        onUpdateTier={vi.fn()}
        onDeactivateTier={onDeactivateTier}
      />,
    );

    await new Promise((r) => setTimeout(r, 10));
    // Клик по кнопке «+» внутри панели (заголовок «Высота» → рядом кнопка увеличения)
    const plus = screen
      .getByText("Высота")
      .closest(".flex.items-center.justify-between")!
      .querySelectorAll("button")[1];
    fireEvent.click(plus);

    expect(onDeactivateTier).not.toHaveBeenCalled();
    expect(screen.getByText("Высота")).toBeInTheDocument();
  });

  it("на десктопной ширине появление activeTier не открывает панель", () => {
    setViewport(1280);
    const { rerender } = render(
      <MobileToolbar {...defaultProps} activeTier={undefined} />,
    );
    rerender(<MobileToolbar {...defaultProps} activeTier={tier("tier-1", "S")} />);

    expect(screen.queryByText("Высота")).not.toBeInTheDocument();
  });

  it("повторная активация той же полки после снятия активности снова открывает панель", () => {
    const { rerender } = render(
      <MobileToolbar
        {...defaultProps}
        activeTier={undefined}
        onUpdateTier={vi.fn()}
      />,
    );

    // Клик по шестерёнке → полка активна → панель открыта
    rerender(
      <MobileToolbar
        {...defaultProps}
        activeTier={tier("tier-1", "S")}
        onUpdateTier={vi.fn()}
      />,
    );
    expect(screen.getByText("Высота")).toBeInTheDocument();

    // Сняли активность (клик вне) → панель закрылась
    rerender(
      <MobileToolbar
        {...defaultProps}
        activeTier={undefined}
        onUpdateTier={vi.fn()}
      />,
    );
    expect(screen.queryByText("Высота")).not.toBeInTheDocument();

    // Снова клик по шестерёнке — панель открывается заново
    rerender(
      <MobileToolbar
        {...defaultProps}
        activeTier={tier("tier-1", "S")}
        onUpdateTier={vi.fn()}
      />,
    );
    expect(screen.getByText("Высота")).toBeInTheDocument();
  });
});
