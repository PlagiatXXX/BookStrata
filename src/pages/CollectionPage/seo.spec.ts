import { describe, it, expect } from "vitest";
import { buildCollectionSeoDesc, buildCollectionSeoTitle, truncateDescription } from "./seo";
import { COLLECTION_SEO } from "@/data/collection-seo";

describe("truncateDescription", () => {
  it("не обрезает короткий текст", () => {
    expect(truncateDescription("Короткое описание")).toBe("Короткое описание");
  });

  it("обрезает длинный текст по границе слова и добавляет многоточие", () => {
    const long =
      "Очень длинное описание подборки, которое нужно обрезать до ста пятидесяти пяти символов " +
      "ровно потому, что поисковая система не показывает больше в сниппете и это тестовое предложение длинное";
    const result = truncateDescription(long);
    expect(result.length).toBeLessThanOrEqual(156);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("buildCollectionSeoDesc", () => {
  it("отдаёт description из админки, когда он заполнен (приоритет над шаблоном)", () => {
    const desc = buildCollectionSeoDesc("Путешествие по литературе Японии", "top-fantasy", "Топ книг фэнтези");
    expect(desc).toBe("Путешествие по литературе Японии");
  });

  it("использует шаблонный SEO-текст, если описание из админки пустое", () => {
    const desc = buildCollectionSeoDesc("", "top-fantasy", "Топ книг фэнтези");
    expect(desc).toContain("фэнтези");
    expect(desc).toBe(COLLECTION_SEO["top-fantasy"]);
  });

  it("использует фолбэк, если нет ни админки, ни шаблона", () => {
    const desc = buildCollectionSeoDesc(null, "no-template-slug", "Какая-то подборка");
    expect(desc).toContain("Какая-то подборка");
    expect(desc).toContain("BookStrata");
  });

  it("обрезает длинное описание из админки, добавляя многоточие", () => {
    const long = "д ".repeat(200);
    const desc = buildCollectionSeoDesc(long, "top-detective", "Топ детективов");
    expect(desc.endsWith("…")).toBe(true);
    // Сервис режет по границе слова на 155 символов + многоточие сверху
    expect(desc.length).toBeLessThanOrEqual(156);
  });
});

describe("buildCollectionSeoTitle", () => {
  it("берёт заголовок из админки", () => {
    expect(buildCollectionSeoTitle("Топ книг фэнтези", "top-fantasy", "")).toBe("Топ книг фэнтези");
  });

  it("падает на читаемый заголовок из шаблона, если в админке пусто", () => {
    expect(buildCollectionSeoTitle(null, "top-fantasy", "Топ книг фэнтези — рейтинг лучших")).toBe(
      "Топ книг фэнтези — рейтинг лучших",
    );
  });

  it("падает на slug, когда нет ни админки, ни шаблона", () => {
    expect(buildCollectionSeoTitle(null, "some-slug", "")).toBe("some-slug");
  });
});