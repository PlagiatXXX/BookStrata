import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DonateModal } from "./DonateModal";

vi.mock("@/lib/analyticsApi", () => ({
  apiTrackEvent: vi.fn(),
}));

vi.mock("@/lib/ym", () => ({
  reachYmGoal: vi.fn(),
}));

const TEST_CARD_NUMBER = "0000 0000 0000 0000";
let originalCardNumber: string | undefined;

describe("DonateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    originalCardNumber = import.meta.env.VITE_DONATE_CARD_NUMBER;
    (import.meta.env as Record<string, unknown>).VITE_DONATE_CARD_NUMBER = TEST_CARD_NUMBER;
  });

  afterEach(() => {
    if (originalCardNumber !== undefined) {
      (import.meta.env as Record<string, unknown>).VITE_DONATE_CARD_NUMBER = originalCardNumber;
    } else {
      delete (import.meta.env as Record<string, unknown>).VITE_DONATE_CARD_NUMBER;
    }
  });

  it("рендерит блок реквизитов с номером карты и кнопку закрытия", () => {
    const handleClose = vi.fn();
    render(<DonateModal onClose={handleClose} />);

    expect(screen.getByText("Угостить автора")).toBeInTheDocument();
    expect(screen.getByText("Реквизиты для перевода")).toBeInTheDocument();
    expect(screen.getByText(TEST_CARD_NUMBER)).toBeInTheDocument();
    expect(screen.getByText("ЮMoney")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Закрыть" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("если VITE_DONATE_CARD_NUMBER не задан — скрывает реквизиты, но оставляет контакты", () => {
    delete (import.meta.env as Record<string, unknown>).VITE_DONATE_CARD_NUMBER;

    render(<DonateModal onClose={vi.fn()} />);

    expect(screen.queryByText("Реквизиты для перевода")).not.toBeInTheDocument();
    expect(screen.queryByText(TEST_CARD_NUMBER)).not.toBeInTheDocument();
    expect(screen.getByText("Связаться")).toBeInTheDocument();
  });
});
