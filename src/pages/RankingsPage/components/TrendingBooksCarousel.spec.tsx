/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TrendingBooksCarousel } from "./TrendingBooksCarousel";
import type { TrendingBook } from "@/lib/bookApi";

const mockBooks: TrendingBook[] = [
  {
    id: 1,
    title: "Гарри Поттер и Философский камень",
    author: "Дж. К. Роулинг",
    coverImageUrl: "https://example.com/cover1.webp",
    slug: "harry-potter-1",
  },
  {
    id: 2,
    title: "Властелин Колец",
    author: "Дж. Р. Р. Толкин",
    coverImageUrl: "https://example.com/cover2.webp",
    slug: "lotr",
  },
];

function renderCarousel(books = mockBooks) {
  return render(
    <MemoryRouter>
      <TrendingBooksCarousel books={books} />
    </MemoryRouter>
  );
}

describe("TrendingBooksCarousel", () => {
  it("рендерит заголовок секции и названия книг", () => {
    renderCarousel();

    expect(screen.getByRole("heading", { level: 2, name: "Тренды недели" })).toBeInTheDocument();
    expect(screen.getByText("Гарри Поттер и Философский камень")).toBeInTheDocument();
    expect(screen.getByText("Властелин Колец")).toBeInTheDocument();
  });

  it("кнопки навигации имеют доступные aria-label для программ чтения с экрана", () => {
    renderCarousel();

    const prevButton = screen.getByRole("button", { name: "Предыдущие книги" });
    const nextButton = screen.getByRole("button", { name: "Следующие книги" });

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it("обложки книг не дублируют alt при наличии текстового заголовка рядом", () => {
    const { container } = renderCarousel();

    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThanOrEqual(2);

    images.forEach((img) => {
      // alt должен быть пустым или изображение скрыто от скринридера, чтобы избежать дублирования
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("aria-hidden")).toBe("true");
    });
  });
});
