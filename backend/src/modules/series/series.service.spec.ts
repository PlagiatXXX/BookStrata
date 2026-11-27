import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  series: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  author: {
    findUnique: vi.fn(),
  },
  book: {
    count: vi.fn(),
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

import {
  createSeries,
  findOrCreateSeriesByName,
  updateSeries,
  deleteSeries,
  getSeriesBySlug,
  listSeries,
} from "./series.service.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";

describe("series.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSeries генерирует slug с разрешением коллизии (-2)", async () => {
    prismaMock.author.findUnique.mockResolvedValue({ id: 7 });
    prismaMock.series.findUnique
      .mockResolvedValueOnce({ id: 1 }) // vedmak занят
      .mockResolvedValueOnce(null); // vedmak-2 свободен
    prismaMock.series.create.mockResolvedValue({
      id: 2,
      name: "Ведьмак",
      slug: "vedmak-2",
      authorId: 7,
      author: { id: 7, name: "Анджей Сапковский", slug: "andzhej-sapkovskij" },
      _count: { books: 0 },
    });

    const created = await createSeries({ name: "Ведьмак", authorId: 7 });

    expect(created.slug).toBe("vedmak-2");
    expect(prismaMock.series.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Ведьмак",
          slug: "vedmak-2",
          authorId: 7,
        }),
      }),
    );
  });

  it("findOrCreateSeriesByName возвращает существующий цикл (case-insensitive)", async () => {
    const existing = {
      id: 5,
      name: "Дюна",
      slug: "dyuna",
      author: null,
      _count: { books: 3 },
    };
    prismaMock.series.findFirst.mockResolvedValue(existing);

    const res = await findOrCreateSeriesByName("  дюна  ");

    expect(res).toEqual(existing);
    expect(prismaMock.series.create).not.toHaveBeenCalled();
  });

  it("updateSeries обновляет название без изменения slug", async () => {
    prismaMock.series.findUnique.mockResolvedValue({ id: 3 });
    prismaMock.series.update.mockResolvedValue({
      id: 3,
      name: "Хроники Дюны",
      slug: "dyuna",
      author: null,
      _count: { books: 2 },
    });

    await updateSeries(3, { name: "Хроники Дюны" });

    expect(prismaMock.series.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: { name: "Хроники Дюны" },
      }),
    );
  });

  it("deleteSeries бросает ConflictError (409), если есть привязанные книги", async () => {
    prismaMock.series.findUnique.mockResolvedValue({ id: 10 });
    prismaMock.book.count.mockResolvedValue(2);

    await expect(deleteSeries(10)).rejects.toThrow(ConflictError);
    expect(prismaMock.series.delete).not.toHaveBeenCalled();
  });

  it("deleteSeries бросает NotFoundError (404), если цикл не существует", async () => {
    prismaMock.series.findUnique.mockResolvedValue(null);

    await expect(deleteSeries(999)).rejects.toThrow(NotFoundError);
  });

  it("getSeriesBySlug фильтрует только published каталоговые книги и сортирует nulls last", async () => {
    prismaMock.series.findUnique.mockResolvedValue({
      id: 1,
      name: "Ведьмак",
      slug: "vedmak",
      books: [],
    });

    await getSeriesBySlug("vedmak");

    expect(prismaMock.series.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "vedmak" },
        include: expect.objectContaining({
          books: expect.objectContaining({
            where: {
              status: "published",
              userId: null,
              mergedIntoId: null,
            },
            orderBy: [
              { seriesOrder: { sort: "asc", nulls: "last" } },
              { publishedYear: { sort: "asc", nulls: "last" } },
              { id: "asc" },
            ],
          }),
        }),
      }),
    );
  });

  it("listSeries возвращает элементы и общее количество", async () => {
    prismaMock.series.findMany.mockResolvedValue([{ id: 1, name: "Дюна" }]);
    prismaMock.series.count.mockResolvedValue(1);

    const res = await listSeries({ q: "Дюна", page: 1, limit: 10 });

    expect(res).toEqual({
      items: [{ id: 1, name: "Дюна" }],
      total: 1,
      page: 1,
      limit: 10,
    });
  });
});
