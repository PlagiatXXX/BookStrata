import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock хойстится — фабрика не должна ссылаться на внешние переменные.
vi.mock("./api-client", () => ({
  apiClient: { get: vi.fn() },
}));

import { apiClient } from "./api-client";
import { getMatchedBooks, matchedBooksKey } from "./matchApi";

const mockGet = vi.mocked(apiClient.get);

describe("getMatchedBooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("шлёт только активные оси + limit + exclude", async () => {
    mockGet.mockResolvedValue({ books: [] });
    await getMatchedBooks({ darkness: 80, storyFocus: 20 }, 3, "current-book");

    expect(mockGet).toHaveBeenCalledWith("/books/match", {
      limit: 3,
      darkness: 80,
      storyFocus: 20,
      exclude: "current-book",
    });
  });

  it("не шлёт неактивные оси вообще", async () => {
    mockGet.mockResolvedValue({ books: [] });
    await getMatchedBooks({ pace: 50 });

    const params = mockGet.mock.calls[0][1] as Record<string, unknown>;
    expect(params).toEqual({ limit: 3, pace: 50 });
  });

  it("возвращает books из ответа", async () => {
    const books = [{ id: 1, slug: "a", title: "A", author: null, coverImageUrl: "/c.jpg", score: 99 }];
    mockGet.mockResolvedValue({ books });
    await expect(getMatchedBooks({ darkness: 80 })).resolves.toEqual(books);
  });
});

describe("matchedBooksKey", () => {
  it("стабилен при разном порядке ключей mood", () => {
    const a = matchedBooksKey({ darkness: 80, storyFocus: 20 }, 3);
    const b = matchedBooksKey({ storyFocus: 20, darkness: 80 }, 3);
    expect(a).toEqual(b);
  });

  it("различается при разных значениях осей", () => {
    const a = matchedBooksKey({ darkness: 80 }, 3);
    const b = matchedBooksKey({ darkness: 20 }, 3);
    expect(a).not.toEqual(b);
  });
});
