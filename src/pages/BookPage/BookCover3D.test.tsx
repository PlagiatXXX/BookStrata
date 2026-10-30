// src/pages/BookPage/BookCover3D.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookCover3D } from "./BookCover3D";

describe("BookCover3D", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит статичную обложку без видео и подсказок, если liveVideoUrl не передан", () => {
    const { container } = render(
      <BookCover3D
        coverImageUrl="https://bookstrata.ru/img/test.webp"
        title="Тестовая книга"
      />,
    );

    const img = screen.getByAltText("Обложка книги «Тестовая книга»");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://bookstrata.ru/img/test.webp");

    // Никаких видео или подсказок
    expect(container.querySelector("video")).toBeNull();
    expect(screen.queryByText(/Наведи мышь/i)).toBeNull();
    expect(screen.queryByText(/Оживить обложку/i)).toBeNull();
  });

  it("рендерит элемент video и десктопную подсказку, когда передан liveVideoUrl", () => {
    const { container } = render(
      <BookCover3D
        coverImageUrl="https://bookstrata.ru/img/test.webp"
        title="Тестовая книга"
        liveVideoUrl="https://bookstrata.ru/video/test.mp4"
      />,
    );

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("src", "https://bookstrata.ru/video/test.mp4");
    expect(screen.getByText(/Наведи мышь/i)).toBeInTheDocument();
  });
});
