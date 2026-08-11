/// <reference types="vitest/globals" />

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FaqPage from "./FaqPage";

type JsonLdObject = Record<string, unknown> & { "@type"?: string };

const FAQ_ITEMS = [
  "Что такое BookStrata?",
  "Это бесплатно?",
  "Как создать свой тир-лист?",
  "Что такое рейтинги книг и подборки?",
  "Как работает ИИ-библиотекарь «Букстраж»?",
  "Могу ли я редактировать чужие тир-листы?",
  "Что делать, если я нашел ошибку, баг или просто хочу оставить отзыв?",
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FaqPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function getButton(question: string) {
  const element = screen.getByText(question);
  return element.closest("button")!;
}

function getFaqJsonLd(): JsonLdObject | undefined {
  const scripts = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  );
  return scripts
    .map((el) => JSON.parse(el.textContent || "{}") as JsonLdObject)
    .find((s) => s["@type"] === "FAQPage");
}

describe("FaqPage", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("рендерит заголовок, хлебные крошки, кнопку «Назад» и все вопросы", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /Вопросы и ответы/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Назад/i })).toBeInTheDocument();
    // Хлебные крошки: активный пункт + ссылка на главную
    const breadcrumbs = screen.getByRole("navigation", { name: "Хлебные крошки" });
    expect(breadcrumbs).toBeInTheDocument();
    expect(breadcrumbs).toHaveTextContent("Вопросы и ответы");
    expect(within(breadcrumbs).getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/");
    for (const question of FAQ_ITEMS) {
      expect(screen.getByText(question)).toBeInTheDocument();
    }
  });

  it("первый вопрос открыт по умолчанию, остальные закрыты", () => {
    renderPage();
    expect(getButton("Что такое BookStrata?")).toHaveAttribute("aria-expanded", "true");
    expect(getButton("Как создать свой тир-лист?")).toHaveAttribute("aria-expanded", "false");
    expect(getButton("Могу ли я редактировать чужие тир-листы?")).toHaveAttribute("aria-expanded", "false");
  });

  it("раскрывает вопрос по клику и закрывает предыдущий", () => {
    renderPage();
    fireEvent.click(getButton("Как создать свой тир-лист?"));
    expect(getButton("Как создать свой тир-лист?")).toHaveAttribute("aria-expanded", "true");
    expect(getButton("Что такое BookStrata?")).toHaveAttribute("aria-expanded", "false");
  });

  it("закрывает открытый вопрос повторным кликом", () => {
    renderPage();
    fireEvent.click(getButton("Что такое BookStrata?"));
    expect(getButton("Что такое BookStrata?")).toHaveAttribute("aria-expanded", "false");
  });

  it("генерирует FAQPage JSON-LD, синхронный с видимым контентом", () => {
    renderPage();
    const faq = getFaqJsonLd();
    expect(faq).toBeDefined();
    const mainEntity = faq!.mainEntity as Array<{
      "@type": string;
      name: string;
      acceptedAnswer: { "@type": string; text: string };
    }>;
    expect(mainEntity).toHaveLength(FAQ_ITEMS.length);
    for (const item of mainEntity) {
      expect(item["@type"]).toBe("Question");
      expect(item.acceptedAnswer["@type"]).toBe("Answer");
      expect(item.acceptedAnswer.text.length).toBeGreaterThan(0);
    }
    // Вопросы в JSON-LD совпадают с вопросами на странице
    const jsonLdQuestions = mainEntity.map((q) => q.name);
    for (const question of FAQ_ITEMS) {
      expect(jsonLdQuestions).toContain(question);
    }
  });

  it("оформляет каждый вопрос как заголовок h2 с якорем", () => {
    renderPage();
    FAQ_ITEMS.forEach((question, index) => {
      const heading = screen.getByRole("heading", { name: question });
      expect(heading.tagName).toBe("H2");
      expect(heading).toHaveAttribute("id", `faq-question-${index}`);
      // Кнопка аккордеона внутри заголовка — клик работает как раньше
      expect(heading.querySelector("button")).not.toBeNull();
    });
  });
});
