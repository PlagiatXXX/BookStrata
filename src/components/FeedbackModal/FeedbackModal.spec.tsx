import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeedbackModal } from "./FeedbackModal";

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

  it("renders Step 1 with emoji buttons and social links when isOpen is true", () => {
    render(
      <FeedbackModal isOpen={true} onDismiss={onDismiss} onSubmit={onSubmit} />
    );

    expect(screen.getByText("Помогите нам стать лучше")).toBeInTheDocument();
    expect(screen.getByText("Всё отлично")).toBeInTheDocument();
    expect(screen.getByText("Есть вопросы / идеи")).toBeInTheDocument();
    expect(screen.getByText("Неудобно / сложно")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Telegram/i })).toHaveAttribute(
      "href",
      "https://t.me/bookstrata"
    );
    expect(screen.getByRole("link", { name: /ВКонтакте/i })).toHaveAttribute(
      "href",
      "https://vk.ru/club237287277"
    );
  });

  it("transitions to Step 2 when an emoji button is clicked", () => {
    render(
      <FeedbackModal isOpen={true} onDismiss={onDismiss} onSubmit={onSubmit} />
    );

    fireEvent.click(screen.getByText("Всё отлично"));

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

    fireEvent.click(screen.getByText("Всё отлично"));

    const textarea = screen.getByPlaceholderText(/Напишите пару слов/i);
    fireEvent.change(textarea, { target: { value: "Супер интерфейс" } });

    fireEvent.click(screen.getByRole("button", { name: /Отправить/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        rating: "great",
        message: "Супер интерфейс",
      });
    });

    expect(await screen.findByText(/Спасибо за отзыв/i)).toBeInTheDocument();
  });

  it("calls onDismiss when close button (cross) is clicked", () => {
    render(
      <FeedbackModal isOpen={true} onDismiss={onDismiss} onSubmit={onSubmit} />
    );

    const closeBtn = screen.getByLabelText("Закрыть");
    fireEvent.click(closeBtn);

    expect(onDismiss).toHaveBeenCalled();
  });

  it("calls onDismiss when Escape key is pressed", () => {
    render(
      <FeedbackModal isOpen={true} onDismiss={onDismiss} onSubmit={onSubmit} />
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onDismiss).toHaveBeenCalled();
  });
});
