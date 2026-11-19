import { describe, expect, it } from "vitest";

import {
  buildTierListSeoDescription,
  buildTierListSeoTitle,
  shouldNoindexTierList,
} from "./seo";

describe("buildTierListSeoTitle", () => {
  it("добавляет автора в заголовок — уникализирует одинаковые названия", () => {
    expect(buildTierListSeoTitle("2026", "fedora")).toBe("2026 — книжный тир-лист от fedora");
  });

  it("не добавляет автора, если никнейм отсутствует", () => {
    expect(buildTierListSeoTitle("2026", null)).toBe("2026 — книжный тир-лист");
    expect(buildTierListSeoTitle("2026", undefined)).toBe("2026 — книжный тир-лист");
  });

  it("добавляет количество книг в заголовок", () => {
    expect(buildTierListSeoTitle("2026", "fedora", 12)).toBe(
      "2026 — книжный тир-лист из 12 книг от fedora",
    );
    expect(buildTierListSeoTitle("2026", null, 5)).toBe(
      "2026 — книжный тир-лист из 5 книг",
    );
  });

  it("игнорирует нулевое/отрицательное количество книг", () => {
    expect(buildTierListSeoTitle("2026", "fedora", 0)).toBe(
      "2026 — книжный тир-лист от fedora",
    );
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
      "Тир-лист «2026» от пользователя fedora — визуальный рейтинг книг, созданный на BookStrata",
    );
  });

  it("не добавляет автора, если никнейм отсутствует", () => {
    expect(buildTierListSeoDescription("2026", null)).toBe(
      "Тир-лист «2026» — визуальный рейтинг книг, созданный на BookStrata",
    );
  });

  it("добавляет количество книг и топ в описание", () => {
    expect(
      buildTierListSeoDescription("2026", "fedora", 12, ["Dune", "1984", "Solaris"]),
    ).toBe(
      "Тир-лист «2026» от пользователя fedora: 12 книг (топ: Dune, 1984, Solaris) — визуальный рейтинг книг, созданный на BookStrata",
    );
  });

  it("добавляет только количество без топа", () => {
    expect(buildTierListSeoDescription("2026", null, 5)).toBe(
      "Тир-лист «2026»: 5 книг — визуальный рейтинг книг, созданный на BookStrata",
    );
  });

  it("возвращает дефолтное описание без названия", () => {
    expect(buildTierListSeoDescription(undefined, "fedora")).toBe(
      "Книжный тир-лист на BookStrata — рейтинг книг по уровням",
    );
  });
});

describe("shouldNoindexTierList", () => {
  it("возвращает true для нового несохранённого тир-листа (new)", () => {
    expect(shouldNoindexTierList("new", true, 10, "Мой список")).toBe(true);
  });

  it("возвращает true для приватного тир-листа", () => {
    expect(shouldNoindexTierList("tl-1", false, 10, "Мой список")).toBe(true);
  });

  it("возвращает true если в списке менее 5 книг (thin content)", () => {
    expect(shouldNoindexTierList("tl-1", true, 4, "Мой список")).toBe(true);
    expect(shouldNoindexTierList("tl-1", true, 1, "Мой список")).toBe(true);
    expect(shouldNoindexTierList("tl-1", true, 0, "Мой список")).toBe(true);
  });

  it("возвращает true если отсутствует название", () => {
    expect(shouldNoindexTierList("tl-1", true, 10, "")).toBe(true);
    expect(shouldNoindexTierList("tl-1", true, 10, null)).toBe(true);
  });

  it("возвращает false для публичного тир-листа с названием и >= 5 книг", () => {
    expect(shouldNoindexTierList("tl-1", true, 5, "Топ фэнтези")).toBe(false);
    expect(shouldNoindexTierList("tl-1", true, 12, "Топ фэнтези")).toBe(false);
  });
});