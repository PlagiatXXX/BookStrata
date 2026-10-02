import { describe, it, expect } from "vitest";
import { authorContentInputSchema } from "./admin-authors.schema.js";

describe("authorContentInputSchema", () => {
  it("пустой объект — валиден, списки по умолчанию пустые", () => {
    const parsed = authorContentInputSchema.parse({});
    expect(parsed.stats).toEqual([]);
    expect(parsed.showcase).toEqual([]);
    expect(parsed.adaptations).toEqual([]);
    expect(parsed.pressQuotes).toEqual([]);
    expect(parsed.heroImageUrl).toBeNull();
  });

  it("полный контент валиден", () => {
    const parsed = authorContentInputSchema.parse({
      heroImageUrl: "/hero.jpg",
      badge: "Лауреат",
      motto: "Мотто",
      manifestoQuote: "Цитата",
      manifestoAuthor: "Иванов",
      manifestoRole: "Критик",
      aboutText: "О творчестве",
      stats: [{ value: "14 млн", label: "книг" }],
      showcase: [{ bookId: 7, pullQuote: "Шедевр" }],
      adaptations: [{ kind: "film", title: "Фильм", meta: "2024", description: "Описание", url: "https://x" }],
      pressQuotes: [{ quote: "Цитата", source: "The New Yorker", sourceRole: "Обозреватель" }],
    });
    expect(parsed.showcase[0]).toEqual({ bookId: 7, pullQuote: "Шедевр" });
    expect(parsed.adaptations[0].kind).toBe("film");
  });

  it("невалидный kind адаптации — ошибка", () => {
    expect(() =>
      authorContentInputSchema.parse({ adaptations: [{ kind: "podcast", title: "X" }] }),
    ).toThrow();
  });

  it("лимиты: больше 4 книг showcase — ошибка", () => {
    const showcase = Array.from({ length: 5 }, (_, i) => ({ bookId: i + 1, pullQuote: null }));
    expect(() => authorContentInputSchema.parse({ showcase })).toThrow();
  });

  it("дублирующийся bookId в showcase — ошибка (защита от P2002 на @@unique)", () => {
    expect(() =>
      authorContentInputSchema.parse({ showcase: [{ bookId: 7 }, { bookId: 7 }] }),
    ).toThrow();
  });

  it("пустая строка в поле — нормализуется в null", () => {
    const parsed = authorContentInputSchema.parse({ badge: "" });
    expect(parsed.badge).toBeNull();
  });
});
