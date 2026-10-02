import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createAdminAuthorService, AdminAuthorError } from "./admin-authors.service.js";

function makeTx() {
  return {
    author: { update: vi.fn().mockResolvedValue({}) },
    authorStat: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
    authorShowcase: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
    authorAdaptation: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
    authorPressQuote: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
    book: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

function makeService(tx = makeTx()) {
  const prisma = {
    author: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
    book: { findMany: vi.fn().mockResolvedValue([{ id: 7 }]) },
    $transaction: vi.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
  };
  const service = createAdminAuthorService(prisma as unknown as PrismaClient);
  return { service, prisma, tx };
}

const fullInput = {
  heroImageUrl: "/hero.jpg", badge: "Бейдж", motto: "Мотто",
  manifestoQuote: "Цитата", manifestoAuthor: "Иванов", manifestoRole: "Критик",
  aboutText: "О творчестве",
  stats: [{ value: "14 млн", label: "книг" }],
  showcase: [{ bookId: 7, pullQuote: "Шедевр" }],
  adaptations: [{ kind: "film" as const, title: "Фильм", meta: "2024", description: null, url: null }],
  pressQuotes: [{ quote: "Цитата", source: "NYT", sourceRole: null }],
};

describe("admin-authors service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("list: поиск по подстроке insensitive, возвращает флаги контента", async () => {
    const { service, prisma } = makeService();
    prisma.author.findMany.mockResolvedValue([
      { id: 1, name: "Вэнс", slug: "vans", _count: { stats: 2, showcase: 1, adaptations: 0, pressQuotes: 3 } },
    ]);
    const list = await service.list("вэнс");
    expect(list).toEqual([
      { id: 1, name: "Вэнс", slug: "vans", statsCount: 2, showcaseCount: 1, adaptationsCount: 0, pressQuotesCount: 3 },
    ]);
    expect(prisma.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { contains: "вэнс", mode: "insensitive" } },
        include: { _count: { select: { stats: true, showcase: true, adaptations: true, pressQuotes: true } } },
      }),
    );
  });

  it("list: авторы с большим числом книг идут выше (books._count desc, tie-break по имени)", async () => {
    const { service, prisma } = makeService();

    await service.list();

    expect(prisma.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ books: { _count: "desc" } }, { name: "asc" }],
      }),
    );
  });

  it("getContent: author не найден → AdminAuthorError author_not_found", async () => {
    const { service, prisma } = makeService();
    prisma.author.findUnique.mockResolvedValue(null);
    await expect(service.getContent(99)).rejects.toMatchObject({ code: "author_not_found" });
  });

  it("getContent: возвращает поля author + списки с книгами showcase", async () => {
    const { service, prisma } = makeService();
    prisma.author.findUnique.mockResolvedValue({
      id: 1, name: "Вэнс", slug: "vans", seoDescription: "x",
      heroImageUrl: "/hero.jpg", badge: null, motto: null,
      manifestoQuote: null, manifestoAuthor: null, manifestoRole: null, aboutText: null,
      stats: [{ value: "14 млн", label: "книг" }],
      showcase: [{ bookId: 7, pullQuote: "Шедевр", order: 0, book: { id: 7, title: "Книга" } }],
      adaptations: [], pressQuotes: [],
    });
    const content = await service.getContent(1);
    expect(content.heroImageUrl).toBe("/hero.jpg");
    expect(content.stats).toHaveLength(1);
    expect(content.showcase[0]).toEqual({ bookId: 7, title: "Книга", pullQuote: "Шедевр" });
  });

  it("saveContent: книга showcase не принадлежит автору → books_not_owned, update не вызван", async () => {
    const { service, prisma, tx } = makeService();
    prisma.book.findMany.mockResolvedValue([]); // книга не принадлежит автору
    await expect(service.saveContent(1, fullInput)).rejects.toBeInstanceOf(AdminAuthorError);
    expect(tx.author.update).not.toHaveBeenCalled();
  });

  it("saveContent: обновляет author и пересоздаёт 4 списка с order по индексу", async () => {
    const { service, prisma, tx } = makeService();
    prisma.book.findMany.mockResolvedValue([{ id: 7 }]);

    await service.saveContent(1, fullInput);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.author.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        heroImageUrl: "/hero.jpg", badge: "Бейдж", motto: "Мотто",
        manifestoQuote: "Цитата", manifestoAuthor: "Иванов", manifestoRole: "Критик",
        aboutText: "О творчестве",
      },
    });
    expect(tx.authorStat.deleteMany).toHaveBeenCalledWith({ where: { authorId: 1 } });
    expect(tx.authorStat.createMany).toHaveBeenCalledWith({
      data: [{ value: "14 млн", label: "книг", authorId: 1, order: 0 }],
    });
    expect(tx.authorShowcase.createMany).toHaveBeenCalledWith({
      data: [{ bookId: 7, pullQuote: "Шедевр", authorId: 1, order: 0 }],
    });
    expect(tx.authorAdaptation.createMany).toHaveBeenCalledTimes(1);
    expect(tx.authorPressQuote.createMany).toHaveBeenCalledTimes(1);
  });

  it("saveContent: P2025 от update → author_not_found", async () => {
    const { service, tx } = makeService();
    tx.author.update.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));
    await expect(service.saveContent(42, fullInput)).rejects.toMatchObject({ code: "author_not_found" });
  });

  it("saveContent: пустые списки — deleteMany вызывается, createMany и проверка книг — нет", async () => {
    const { service, prisma, tx } = makeService();
    const empty = { ...fullInput, stats: [], showcase: [], adaptations: [], pressQuotes: [] };
    await service.saveContent(1, empty);
    expect(tx.authorStat.deleteMany).toHaveBeenCalled();
    expect(tx.authorStat.createMany).not.toHaveBeenCalled();
    expect(prisma.book.findMany).not.toHaveBeenCalled();
  });
});
