import { describe, expect, it } from "vitest";

import {
  buildTierListSeoDescription,
  buildTierListSeoTitle,
} from "./seo";

describe("buildTierListSeoTitle", () => {
  it("добавляет автора в заголовок — уникализирует одинаковые названия", () => {
    expect(buildTierListSeoTitle("2026", "fedora")).toBe("2026 — книжный тир-лист от @fedora");
  });

  it("не добавляет автора, если никнейм отсутствует", () => {
    expect(buildTierListSeoTitle("2026", null)).toBe("2026 — книжный тир-лист");
    expect(buildTierListSeoTitle("2026", undefined)).toBe("2026 — книжный тир-лист");
  });

  it("возвращает дефолтный заголовок без названия", () => {
    expect(buildTierListSeoTitle(undefined, "fedora")).toBe("Книжный тир-лист");
    expect(buildTierListSeoTitle(null, null)).toBe("Книжный тир-лист");
    expect(buildTierListSeoTitle("", "fedora")).toBe("Книжный тир-лист");
  });
});

describe("buildTierListSeoDescription", () => {
  it("добавляет автора в описание", () => {
    expect(buildTierListSeoDescription("2026", "fedora")).toBe(
      "Тир-лист «2026» от пользователя @fedora — визуальный рейтинг книг, созданный на BookStrata",
    );
  });

  it("не добавляет автора, если никнейм отсутствует", () => {
    expect(buildTierListSeoDescription("2026", null)).toBe(
      "Тир-лист «2026» — визуальный рейтинг книг, созданный на BookStrata",
    );
  });

  it("возвращает дефолтное описание без названия", () => {
    expect(buildTierListSeoDescription(undefined, "fedora")).toBe(
      "Книжный тир-лист на BookStrata — рейтинг книг по уровням",
    );
  });
});