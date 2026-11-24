import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DnaWelcomeModal } from "./DnaWelcomeModal";

describe("DnaWelcomeModal", () => {
  const onDismiss = vi.fn();
  const onAccept = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null / does not render dialog when isOpen === false", () => {
    const { container } = render(
      <DnaWelcomeModal
        isOpen={false}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders with role='dialog', aria attributes, title, stamp, and buttons when isOpen === true", () => {
    render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "dna-welcome-title");
    expect(dialog).toHaveAttribute("aria-describedby", "dna-welcome-desc");

    expect(screen.getByText("Ваш билет уже ждёт")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ответьте на шесть вопросов о вкусе — и получите номерной билет читателя с вашим ДНК."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("BookStrata")).toBeInTheDocument();
    expect(screen.getByText("Билет читателя")).toBeInTheDocument();
    expect(screen.getByText("6 осей вкуса")).toBeInTheDocument();
    expect(screen.getByText("Книжный ДНК")).toBeInTheDocument();
    expect(screen.getByText("ОДОБРЕНО")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Узнать свой ДНК" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Позже" })).toBeInTheDocument();
    expect(screen.getByLabelText("Закрыть")).toBeInTheDocument();
  });

  it("does not contain removed legacy ticket content", () => {
    render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    expect(
      screen.queryByText(/Категория: Персональный профиль/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Статус: Готов к калибровке/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/CALIBRATION PASS/)
    ).not.toBeInTheDocument();
  });

  it("calls onAccept when clicking 'Узнать свой ДНК'", () => {
    render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    const ctaButton = screen.getByRole("button", { name: "Узнать свой ДНК" });
    fireEvent.click(ctaButton);

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("calls onDismiss when clicking 'Позже'", () => {
    render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    const dismissButton = screen.getByRole("button", { name: "Позже" });
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("calls onDismiss when clicking the close button (aria-label='Закрыть')", () => {
    render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    const closeButton = screen.getByLabelText("Закрыть");
    fireEvent.click(closeButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when clicking the backdrop (outside the modal card)", () => {
    render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    const backdrop = screen.getByTestId("dna-modal-backdrop");

    // Clicking inside the modal card does not trigger onDismiss due to stopPropagation
    const title = screen.getByText("Ваш билет уже ждёт");
    fireEvent.click(title);
    expect(onDismiss).not.toHaveBeenCalled();

    // Clicking directly on the backdrop triggers onDismiss
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when pressing the Escape key on window", () => {
    render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("rolls ticket number and fixes to BS-00427 after ticker finishes", () => {
    vi.useFakeTimers();

    render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    // Initial rolling state starts with BS-
    expect(screen.getByText(/BS-/)).toBeInTheDocument();

    // Fast-forward ticker timer (1.4s)
    act(() => {
      vi.advanceTimersByTime(1450);
    });

    expect(screen.getByText("BS-00427")).toBeInTheDocument();
  });

  it("handles pointer move and pointer leave for 3D tilt without throwing", () => {
    render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    const title = screen.getByText("Ваш билет уже ждёт");
    const card = title.closest("div[class*='rounded-2xl']");
    expect(card).toBeInTheDocument();

    if (card) {
      // Desktop pointer move
      fireEvent.pointerMove(card, {
        clientX: 100,
        clientY: 100,
        pointerType: "mouse",
      });

      // Touch pointer move should be ignored
      fireEvent.pointerMove(card, {
        clientX: 100,
        clientY: 100,
        pointerType: "touch",
      });

      // Pointer leave resets tilt
      fireEvent.pointerLeave(card);
    }
  });

  it("resets rolling ticker when modal is reopened", () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    act(() => {
      vi.advanceTimersByTime(1450);
    });
    expect(screen.getByText("BS-00427")).toBeInTheDocument();

    // Close modal
    rerender(
      <DnaWelcomeModal
        isOpen={false}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );

    // Reopen modal
    rerender(
      <DnaWelcomeModal
        isOpen={true}
        onDismiss={onDismiss}
        onAccept={onAccept}
      />
    );
    expect(screen.getByText(/BS-/)).toBeInTheDocument();
  });
});
