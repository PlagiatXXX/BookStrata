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
      findFirst: vi.fn(),
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

// Мокаем фабрику authorService, который используется в updateBookCatalog
vi.mock("../authors/authors.service.js", () => ({
  authorService: {
    findOrCreate: vi.fn().mockResolvedValue({ id: 1 }),
  },
  createAuthorService: () => ({
    findOrCreate: vi.fn().mockResolvedValue({ id: 1 }),
  }),
}));

describe("IDOR: PUT каталоговых полей книги в чужом тир-листе", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.bookPlacement.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("НЕ должен обновлять каталог книги, если её нет в тир-листе (BookPlacement отсутствует)", async () => {
    // Тир-лист владельца существует
    (prisma.tierList.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "list-1" });
    // Книга — draft (проходит проверку статуса), но НЕ размещена в этом тир-листе
    (prisma.bookPlacement.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.book.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "draft" });

    // Попытка править каталоговые поля книги, которой нет в листе
    await expect(
      service.updateBookPlacement("list-1", 42, { }),
    ).rejects.toThrow("Book does not belong to this tier list");

    // Глобальная книга (каталог) не должна быть тронута
    expect(prisma.book.update).not.toHaveBeenCalled();
  });

  it("должен обновлять каталог draft-книги, размещённой в тир-листе", async () => {
    (prisma.tierList.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "list-1" });
    (prisma.bookPlacement.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      tierListId: "list-1",
      bookId: 42,
    });
    (prisma.book.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "draft" });

    await service.updateBookCatalogIfPlaced("list-1", 42, { title: "Новое название" });

    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 42 } }),
    );
  });

  it("НЕ должен обновлять каталог, если placement есть, но книга published", async () => {
    (prisma.tierList.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "list-1" });
    (prisma.bookPlacement.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      tierListId: "list-1",
      bookId: 42,
    });
    (prisma.book.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "published" });

    await service.updateBookCatalogIfPlaced("list-1", 42, { title: "Взлом" });

    expect(prisma.book.update).not.toHaveBeenCalled();
  });

  it("НЕ должен обновлять каталог, если placement отсутствует (главный IDOR-кейс)", async () => {
    (prisma.tierList.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "list-1" });
    (prisma.bookPlacement.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.book.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "draft" });

    await expect(
      service.updateBookCatalogIfPlaced("list-1", 42, { title: "Взлом чужой книги" }),
    ).rejects.toThrow("Book does not belong to this tier list");

    expect(prisma.book.update).not.toHaveBeenCalled();
  });
});
