// Регресс: редактор тир-листа адресует лист по slug (например, /tier-lists/tir-list-f108sn),
// а BookPlacement хранит uuid тир-листа. Пока адрес не резолвился, сохранение каталоговых
// полей карточки книги всегда падало с 404 «Book does not belong to this tier list»,
// хотя вхождение в листе есть (прод, 16.10: книги 2256–2263).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../lib/prisma.js";
import * as service from "./tierList.books.service.js";

vi.mock("../../lib/prisma.js", () => {
  const prismaMock = {
    $transaction: vi.fn(async (arg: any) =>
      typeof arg === "function" ? arg(prismaMock) : Promise.all(arg),
    ),
    tierList: {
      findUnique: vi.fn(),
    },
    bookPlacement: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    book: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    author: {
      findFirst: vi.fn(),
    },
  };
  return { prisma: prismaMock };
});

vi.mock("../authors/authors.service.js", () => ({
  authorService: {
    findOrCreate: vi.fn().mockResolvedValue({ id: 1 }),
  },
  createAuthorService: () => ({
    findOrCreate: vi.fn().mockResolvedValue({ id: 1 }),
  }),
}));

const REAL_ID = "712bc967-f7c9-43ca-9ede-1b0350edac2a";
const SLUG = "tir-list-f108sn";

const findUniqueMock = () => prisma.tierList.findUnique as ReturnType<typeof vi.fn>;
const placementMock = () => prisma.bookPlacement.findUnique as ReturnType<typeof vi.fn>;
const bookMock = () => prisma.book.findUnique as ReturnType<typeof vi.fn>;

describe("updateBookCatalogIfPlaced: адресация тир-листа по slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.book.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    // Репозиторий резолвит и uuid, и slug — как getWhereClause в tier-list.repository.ts
    findUniqueMock().mockImplementation(async ({ where }: any) =>
      where.slug === SLUG || where.id === REAL_ID ? { id: REAL_ID } : null,
    );

    // Вхождение в БД лежит под uuid тир-листа, а не под slug
    placementMock().mockImplementation(async ({ where }: any) => {
      const { tierListId, bookId } = where.tierListId_bookId;
      return tierListId === REAL_ID && bookId === 2256
        ? { tierListId: REAL_ID, bookId: 2256 }
        : null;
    });

    bookMock().mockResolvedValue({ status: "draft" });
  });

  it("находит вхождение по slug и обновляет каталог draft-книги", async () => {
    await service.updateBookCatalogIfPlaced(SLUG, 2256, { title: "Педро Парамо" });

    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2256 } }),
    );
  });

  it("по-прежнему бросает 404, если вхождения в листе нет", async () => {
    await expect(
      service.updateBookCatalogIfPlaced(SLUG, 9999, { title: "Взлом" }),
    ).rejects.toThrow("Book does not belong to this tier list");

    expect(prisma.book.update).not.toHaveBeenCalled();
  });

  it("бросает 404, если листа не существует", async () => {
    findUniqueMock().mockResolvedValue(null);

    await expect(
      service.updateBookCatalogIfPlaced("no-such-list", 2256, { title: "Педро Парамо" }),
    ).rejects.toThrow("Tier list not found");

    expect(prisma.book.update).not.toHaveBeenCalled();
  });
});
