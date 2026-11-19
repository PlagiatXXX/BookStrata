/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShareSuccessModal } from "./ShareSuccessModal";

describe("ShareSuccessModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Мой топ фантастики",
    shareUrl: "https://bookstrata.ru/tier-lists/fantastika",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.open = vi.fn();
  });

  it("рендерит заголовок и название тир-листа при isOpen = true", () => {
    render(<ShareSuccessModal {...defaultProps} />);

    expect(screen.getByText("Тир-лист сохранён!")).toBeInTheDocument();
    expect(screen.getByText("Мой топ фантастики")).toBeInTheDocument();
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText("ВКонтакте")).toBeInTheDocument();
  });

  it("не рендерит ничего если isOpen = false", () => {
    const { container } = render(<ShareSuccessModal {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("открывает Telegram шаринг при клике на кнопку Telegram", () => {
    render(<ShareSuccessModal {...defaultProps} />);

    const tgBtn = screen.getByRole("button", { name: /telegram/i });
    fireEvent.click(tgBtn);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://t.me/share/url"),
      "_blank",
      expect.any(String),
    );
  });

  it("открывает VK шаринг при клике на кнопку ВКонтакте", () => {
    render(<ShareSuccessModal {...defaultProps} />);

    const vkBtn = screen.getByRole("button", { name: /вконтакте/i });
    fireEvent.click(vkBtn);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://vk.com/share.php"),
      "_blank",
      expect.any(String),
    );
  });

  it("копирует ссылку в буфер обмена при клике на кнопку копирования", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<ShareSuccessModal {...defaultProps} />);

    const copyBtn = screen.getByRole("button", { name: /копировать/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("https://bookstrata.ru/tier-lists/fantastika");
  });

  it("закрывает модалку при клике на кнопку «Продолжить редактирование»", () => {
    const onClose = vi.fn();
    render(<ShareSuccessModal {...defaultProps} onClose={onClose} />);

    const continueBtn = screen.getByRole("button", { name: /продолжить редактирование/i });
    fireEvent.click(continueBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it("отображает переданную обложку тир-листа в превью-карточке", () => {
    render(
      <ShareSuccessModal
        {...defaultProps}
        coverImageUrl="https://bookstrata.ru/img/test-cover.jpg"
        booksCount={12}
      />
    );

    const img = screen.getByRole("img", { name: "Мой топ фантастики" });
    expect(img).toHaveAttribute("src", "https://bookstrata.ru/img/test-cover.jpg");
    expect(screen.getByText(/12 книг в списке/)).toBeInTheDocument();
  });
});
