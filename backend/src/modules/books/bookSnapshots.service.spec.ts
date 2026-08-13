import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma.js";
import { enrichBookSnapshots, normalizeSnapshotText } from "./bookSnapshots.service.js";

const mockFindMany = prisma.book.findMany as unknown as ReturnType<typeof vi.fn>;

describe("normalizeSnapshotText", () => {
  it("приводит к нижнему регистру и схлопывает пробелы", () => {
    expect(normalizeSnapshotText("  Лев  Толстой ")).toBe("лев толстой");
  });

  it("заменяет ё на е", () => {
    expect(normalizeSnapshotText("Фёдор Достоевский")).toBe("федор достоевский");
  });
});

describe("enrichBookSnapshots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("добавляет slug и status published в снимки опубликованных книг", async () => {
    mockFindMany.mockResolvedValue([
      { title: "Анна Каренина", author: "Лев Толстой", slug: "anna-karenina" },
    ]);

    const result = await enrichBookSnapshots({
      a1: { id: "a1", title: "Анна Каренина", author: "Лев Толстой" },
      a2: { id: "a2", title: "Другая книга", author: "Кто-то" },
    });

    expect(result).toEqual({
      a1: {
        id: "a1",
        title: "Анна Каренина",
        author: "Лев Толстой",
        slug: "anna-karenina",
        status: "published",
      },
      a2: { id: "a2", title: "Другая книга", author: "Кто-то" },
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { status: "published", slug: { not: null } },
      select: { title: true, author: true, slug: true },
    });
  });

  it("не трогает снимок, если книга в каталоге draft", async () => {
    mockFindMany.mockResolvedValue([]);
    const books = { b1: { id: "b1", title: "Анна Каренина", author: "Лев Толстой" } };

    const result = await enrichBookSnapshots(books);

    expect(result).toBe(books);
  });

  it("сравнивает нормализованно: регистр и ё/е не мешают матчингу", async () => {
    mockFindMany.mockResolvedValue([
      { title: "Преступление и наказание", author: "Фёдор Достоевский", slug: "prestuplenie-i-nakazanie" },
    ]);

    const result = await enrichBookSnapshots({
      d1: { id: "d1", title: "Преступление и наказание", author: "ФЕДОР ДОСТОЕВСКИЙ" },
    });

    expect((result as Record<string, Record<string, unknown>>).d1.slug).toBe("prestuplenie-i-nakazanie");
  });

  it("книга без автора матчится только по названию с пустым автором", async () => {
    mockFindMany.mockResolvedValue([
      { title: "Аноним", author: null, slug: "anonim" },
      { title: "Аноним", author: "Другой Автор", slug: "anonim-drugoy" },
    ]);

    const result = await enrichBookSnapshots({
      x1: { id: "x1", title: "Аноним" },
    });

    expect((result as Record<string, Record<string, unknown>>).x1.slug).toBe("anonim");
  });

  it("возвращает как есть null, массив и не-объектные значения", async () => {
    expect(await enrichBookSnapshots(null)).toBeNull();
    expect(await enrichBookSnapshots(undefined)).toBeUndefined();
    expect(await enrichBookSnapshots("строка")).toBe("строка");
    const arr = [{ title: "Книга" }];
    expect(await enrichBookSnapshots(arr)).toBe(arr);
  });

  it("не делает запрос к каталогу, если снимков нет", async () => {
    await enrichBookSnapshots({});
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});