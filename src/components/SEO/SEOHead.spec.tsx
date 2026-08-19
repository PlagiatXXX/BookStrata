/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SEOHead } from "./SEOHead";

type JsonLdObject = Record<string, unknown> & { "@type"?: string };

function getJsonLdScripts(): JsonLdObject[] {
  return Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  ).map((el) => JSON.parse(el.textContent || "{}") as JsonLdObject);
}

function getPersonJsonLd(): JsonLdObject | undefined {
  return getJsonLdScripts().find((s) => s["@type"] === "Person");
}

function getArticleJsonLd(): JsonLdObject | undefined {
  return getJsonLdScripts().find((s) => s["@type"] === "Article");
}

describe("SEOHead", () => {
  it("не рендерит Person JSON-LD без пропа person", () => {
    render(<SEOHead title="Тест" url="/test" />);
    expect(getPersonJsonLd()).toBeUndefined();
  });

  it("рендерит Person JSON-LD при передаче person", () => {
    render(
      <SEOHead
        title="Иван Иванов"
        url="/users/42"
        person={{
          name: "Иван Иванов",
          image: "https://example.com/avatar.jpg",
          description: "Описание профиля",
          knowsAbout: "Писатель",
        }}
      />,
    );

    const person = getPersonJsonLd();
    expect(person).toBeDefined();
    expect(person!.name).toBe("Иван Иванов");
    expect(person!.url).toBe("https://bookstrata.ru/users/42");
    expect(person!.image).toBe("https://example.com/avatar.jpg");
    expect(person!.description).toBe("Описание профиля");
    expect(person!.knowsAbout).toBe("Писатель");
  });

  it("использует description из пропа description, если person.description не задан", () => {
    render(
      <SEOHead
        title="Иван Иванов"
        description="Профиль пользователя на BookStrata"
        url="/users/42"
        person={{ name: "Иван Иванов" }}
      />,
    );

    const person = getPersonJsonLd();
    expect(person).toBeDefined();
    expect(person!.description).toBe("Профиль пользователя на BookStrata");
  });

  it("не добавляет knowsAbout, если он не передан", () => {
    render(
      <SEOHead
        title="Иван Иванов"
        url="/users/42"
        person={{ name: "Иван Иванов" }}
      />,
    );

    const person = getPersonJsonLd();
    expect(person).toBeDefined();
    expect(person!.knowsAbout).toBeUndefined();
  });

  it("рендерит Article JSON-LD с датами и автором", () => {
    render(
      <SEOHead
        title="Тир-лист «Фантастика»"
        url="/tier-lists/fantastika"
        type="article"
        publishedTime="2024-01-01T10:00:00Z"
        dateModified="2024-05-01T10:00:00Z"
        author="reader"
      />,
    );

    const article = getArticleJsonLd();
    expect(article).toBeDefined();
    expect(article!.datePublished).toBe("2024-01-01T10:00:00Z");
    expect(article!.dateModified).toBe("2024-05-01T10:00:00Z");
    expect(article!.author).toEqual({ "@type": "Person", name: "reader" });
  });

  it("не добавляет dateModified в Article JSON-LD, если он не передан", () => {
    render(
      <SEOHead title="Статья" url="/blog/statya" type="article" publishedTime="2024-01-01T10:00:00Z" />,
    );

    const article = getArticleJsonLd();
    expect(article).toBeDefined();
    expect(article!.datePublished).toBe("2024-01-01T10:00:00Z");
    expect(article!.dateModified).toBeUndefined();
  });

  it("рендерит meta article:modified_time и meta author при передаче пропсов", () => {
    render(
      <SEOHead
        title="Тир-лист «Фантастика»"
        url="/tier-lists/fantastika"
        type="article"
        publishedTime="2024-01-01T10:00:00Z"
        dateModified="2024-05-01T10:00:00Z"
        author="reader"
      />,
    );

    expect(document.querySelector('meta[property="article:published_time"]')?.getAttribute("content")).toBe(
      "2024-01-01T10:00:00Z",
    );
    expect(document.querySelector('meta[property="article:modified_time"]')?.getAttribute("content")).toBe(
      "2024-05-01T10:00:00Z",
    );
    expect(document.querySelector('meta[name="author"]')?.getAttribute("content")).toBe("reader");
  });

  it("не рендерит meta article:modified_time без пропа dateModified", () => {
    render(
      <SEOHead title="Статья" url="/blog/statya" type="article" publishedTime="2024-01-01T10:00:00Z" />,
    );

    expect(document.querySelector('meta[property="article:modified_time"]')).toBeNull();
  });

  it("при hideSiteName: title и document.title без бренда, og:title и twitter:title с брендом", () => {
    render(
      <SEOHead
        title="Анна Каренина — Лев Толстой: описание и рейтинг"
        url="/books/anna-karenina"
        hideSiteName
      />,
    );

    expect(document.title).toBe("Анна Каренина — Лев Толстой: описание и рейтинг");
    expect(
      document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    ).toBe("Анна Каренина — Лев Толстой: описание и рейтинг | BookStrata");
    expect(
      document.querySelector('meta[name="twitter:title"]')?.getAttribute("content"),
    ).toBe("Анна Каренина — Лев Толстой: описание и рейтинг | BookStrata");
  });

  it("без hideSiteName бренд добавляется и в title, и в og:title (текущее поведение)", () => {
    render(<SEOHead title="Тир-листы книг" url="/tier-lists" />);

    expect(document.title).toBe("Тир-листы книг | BookStrata");
    expect(
      document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    ).toBe("Тир-листы книг | BookStrata");
  });
});
