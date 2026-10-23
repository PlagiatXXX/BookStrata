import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getFromCache: vi.fn(),
  setToCache: vi.fn(),
  resolveTierListId: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  tierList: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  bookPlacement: {
    findMany: vi.fn(),
  },
}));

vi.mock("../../lib/cache.js", () => ({
  getFromCache: mocks.getFromCache,
  setToCache: mocks.setToCache,
}));

vi.mock("./tierList.utils.js", () => ({
  prisma: prismaMock,
  resolveTierListId: mocks.resolveTierListId,
  tierListRepository: {},
}));

import { getSimilarTierLists } from "./tierList.crud.service.js";

describe("getSimilarTierLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFromCache.mockResolvedValue(null);
    mocks.resolveTierListId.mockImplementation(async (id: string) => id);
  });

  it("возвращает публичные тир-листы с общими книгами", async () => {
    prismaMock.tierList.findUnique.mockResolvedValue({ isPublic: true, userId: 1 });
    prismaMock.bookPlacement.findMany
      .mockResolvedValueOnce([
        { book: { title: "Гэтсби", author: "Фицджеральд" } },
      ])
      .mockResolvedValueOnce([
        {
          tierListId: "tl-2",
          book: { title: "гэтсби ", author: "фицджеральд" },
          tierList: { id: "tl-2", likesCount: 3, userId: 2 },
        },
      ]);
    prismaMock.tierList.findMany.mockResolvedValue([
      {
        id: "tl-2",
        title: "Тир-лист 2",
        slug: "tier-list-2",
        likesCount: 3,
        user: { id: 2, username: "reader", avatarUrl: null },
        _count: { placements: 5 },
      },
    ]);

    const result = await getSimilarTierLists("tl-1", 4);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "tl-2", booksCount: 5, authorName: "reader" });
    expect(mocks.setToCache).toHaveBeenCalledWith(
      "tierlist:similar:tl-1:4",
      expect.any(Array),
      300,
    );
  });

  it("возвращает [] и кэширует, если у тир-листа нет книг", async () => {
    prismaMock.tierList.findUnique.mockResolvedValue({ isPublic: true, userId: 1 });
    prismaMock.bookPlacement.findMany.mockResolvedValueOnce([]);

    const result = await getSimilarTierLists("tl-1", 4);

    expect(result).toEqual([]);
    expect(prismaMock.bookPlacement.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.setToCache).toHaveBeenCalledWith("tierlist:similar:tl-1:4", [], 300);
  });

  it("возвращает [] и кэширует, если общих книг не нашлось", async () => {
    prismaMock.tierList.findUnique.mockResolvedValue({ isPublic: true, userId: 1 });
    prismaMock.bookPlacement.findMany
      .mockResolvedValueOnce([{ book: { title: "Гэтсби", author: "Фицджеральд" } }])
      .mockResolvedValueOnce([
        {
          tierListId: "tl-2",
          book: { title: "Другая книга", author: "Другой автор" },
          tierList: { id: "tl-2", likesCount: 1, userId: 2 },
        },
      ]);

    const result = await getSimilarTierLists("tl-1", 4);

    expect(result).toEqual([]);
    expect(mocks.setToCache).toHaveBeenCalledWith("tierlist:similar:tl-1:4", [], 300);
  });

  it("не обращается к БД при попадании в кэш", async () => {
    const cached = [{ id: "tl-2" }];
    mocks.getFromCache.mockResolvedValue(cached);

    const result = await getSimilarTierLists("tl-1", 4);

    expect(result).toBe(cached);
    expect(prismaMock.tierList.findUnique).not.toHaveBeenCalled();
  });
});
