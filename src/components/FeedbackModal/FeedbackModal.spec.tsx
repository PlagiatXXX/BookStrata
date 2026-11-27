import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeedbackModal } from "./FeedbackModal";

vi.mock("@/lib/analyticsApi", () => ({
  apiTrackEvent: vi.fn(),
}));

describe("FeedbackModal", () => {
  const onDismiss = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <FeedbackModal isOpen={false} onDismiss={onDismiss} onSubmit={onSubmit} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders Step 1 with 5 stars and social links when isOpen is true", () => {
    render(
      <FeedbackModal isOpen={true} onDismiss={onDismiss} onSubmit={onSubmit} />
    );

    expect(screen.getByText("Помогите нам стать лучше")).toBeInTheDocument();
    expect(screen.getByText("Какое впечатление от работы сайта?")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);

    expect(screen.getByRole("link", { name: /Telegram/i })).toHaveAttribute(
      "href",
      "https://t.me/bookstrata"
    );
    expect(screen.getByRole("link", { name: /ВКонтакте/i })).toHaveAttribute(
      "href",
      "https://vk.ru/club237287277"
    );
  });

  it("transitions to Step 2 when a star is clicked", () => {
    render(
      <FeedbackModal isOpen={true} onDismiss={onDismiss} onSubmit={onSubmit} />
    );

    fireEvent.click(screen.getByRole("radio", { name: /5/ }));

    expect(
      screen.getByText("Что вам больше всего нравится на сайте?")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Напишите пару слов/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Отправить/i })).toBeInTheDocument();
  });

  it("calls onSubmit with rating and message, then displays success screen", async () => {
    render(
      <FeedbackModal isOpen={true} onDismiss={onDismiss} onSubmit={onSubmit} />
    );

    fireEvent.click(screen.getByRole("radio", { name: /5/ }));

    const textarea = screen.getByPlaceholderText(/Напишите пару слов/i);
    fireEvent.change(textarea, { target: { value: "Супер интерфейс" } });

    fireEvent.click(screen.getByRole("button", { name: /Отправить/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        rating: 5,
        message: "Супер интерфейс",
      });
    });

    expect(await screen.findByText(/Спасибо за отзыв/i)).toBeInTheDocument();
  });

  it("calls onDismiss only when close button (cross) is clicked, ignoring backdrop and Escape", () => {
    render(
      <FeedbackModal isOpen={true} onDismiss={onDismiss} onSubmit={onSubmit} />
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();

    const closeBtn = screen.getByLabelText("Закрыть");
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});