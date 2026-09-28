import { describe, expect, it } from "vitest";
import { buildAuthorSeoTitle, buildAuthorDescription, buildAuthorJsonLd } from "./seo";

describe("buildAuthorSeoTitle", () => {
  it("формирует title с хвостом-запросом (бренд добавит SEOHead)", () => {
    expect(buildAuthorSeoTitle("Лев Толстой")).toBe(
      "Лев Толстой — все книги: рейтинг и библиография",
    );
  });

  it("имя с спецсимволами не ломает title", () => {
    expect(buildAuthorSeoTitle("O'Brien & Co")).toBe(
      "O'Brien & Co — все книги: рейтинг и библиография",
    );
  });
});

describe("buildAuthorDescription", () => {
  it("короткий первый абзац целиком", () => {
    expect(buildAuthorDescription("Описание автора. Второе предложение.")).toBe(
      "Описание автора. Второе предложение.",
    );
  });

  it("берёт только первый абзац из многострочного текста", () => {
    expect(buildAuthorDescription("Первый абзац.\nВторой абзац.")).toBe("Первый абзац.");
  });

  it("длинный текст обрезается до 155 символов по границе слова с многоточием", () => {
    const long = "Слово слова слово ".repeat(30);
    const result = buildAuthorDescription(long);
    expect(result.length).toBeLessThanOrEqual(156);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("  ");
  });

  it("fallback без seoDescription", () => {
    const result = buildAuthorDescription(null);
    expect(result).toContain("BookStrata");
    expect(result.length).toBeGreaterThan(0);
  });

  it("null и undefined не падают", () => {
    expect(buildAuthorDescription(null)).toBe(buildAuthorDescription(undefined));
  });
});

describe("buildAuthorJsonLd", () => {
  it("Person с name и url", () => {
    const ld = buildAuthorJsonLd({ name: "Лев Толстой", slug: "lev-tolstoy" });
    expect(ld["@type"]).toBe("Person");
    expect(ld.name).toBe("Лев Толстой");
    expect(ld.url).toBe("https://bookstrata.ru/authors/lev-tolstoy");
    expect(ld["@context"]).toBe("https://schema.org");
  });

  it("БЕЗ aggregateRating (решение проекта — не размечаем слабые рейтинги)", () => {
    const ld = buildAuthorJsonLd({ name: "X", slug: "x" });
    expect(ld).not.toHaveProperty("aggregateRating");
    expect(ld).not.toHaveProperty("description");
  });
});
