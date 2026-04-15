import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Моки для Prisma — объявляем внутри factory для vi.mock
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tierList: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tier: {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    bookPlacement: {
      upsert: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    book: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Импортируем после vi.mock
import { prisma } from "../../lib/prisma.js";
import * as service from "./tierList.service.js";

describe("tierList.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getUserTierLists", () => {
    const mockUserId = 1;
    const mockQuery = { page: "1", pageSize: "10" };

    const mockTierLists = [
      {
        id: 1,
        userId: mockUserId,
        title: "Test List 1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
        isPublic: true,
        likesCount: 5,
        user: { id: mockUserId, username: "testuser", avatarUrl: null },
        _count: { placements: 10 },
        placements: [
          { book: { coverImageUrl: "cover1.jpg" } },
          { book: { coverImageUrl: "cover2.jpg" } },
        ],
      },
      {
        id: 2,
        userId: mockUserId,
        title: "Test List 2",
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-04"),
        isPublic: false,
        likesCount: 3,
        user: { id: mockUserId, username: "testuser", avatarUrl: null },
        _count: { placements: 5 },
        placements: [{ book: { coverImageUrl: "cover3.jpg" } }],
      },
    ];

    it("должен вернуть список тир-листов пользователя с пагинацией", async () => {
      (prisma.$transaction as any).mockResolvedValue([mockTierLists, 2]);

      const result = await service.getUserTierLists(mockUserId, mockQuery);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({
        id: 1,
        title: "Test List 1",
        likesCount: 5,
        booksCount: 10,
        coverImages: ["cover1.jpg", "cover2.jpg"],
      });
      expect(result.meta).toMatchObject({
        totalItems: 2,
        itemCount: 2,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      });
    });

    it("должен правильно рассчитать totalPages", async () => {
      const largeList = Array(25)
        .fill(null)
        .map((_, i) => ({
          ...mockTierLists[0],
          id: i + 1,
          title: `List ${i + 1}`,
        }));

      (prisma.$transaction as any).mockResolvedValue([largeList, 25]);

      const result = await service.getUserTierLists(mockUserId, {
        page: "1",
        pageSize: "10",
      });

      expect(result.meta.totalPages).toBe(3); // ceil(25/10) = 3
    });

    it("должен вернуть пустой массив если нет тир-листов", async () => {
      (prisma.$transaction as any).mockResolvedValue([[], 0]);

      const result = await service.getUserTierLists(mockUserId, mockQuery);

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });
  });

  describe("createTierList", () => {
    const mockUserId = 1;
    const mockTitle = "My New Tier List";

    const mockCreatedTierList = {
      id: 1,
      userId: mockUserId,
      title: mockTitle,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tiers: [
        { id: 1, title: "S", color: "#FF6B6B", rank: 0 },
        { id: 2, title: "A", color: "#4ECDC4", rank: 1 },
        { id: 3, title: "B", color: "#45B7D1", rank: 2 },
        { id: 4, title: "C", color: "#96CEB4", rank: 3 },
        { id: 5, title: "D", color: "#FFEAA7", rank: 4 },
      ],
      placements: [],
      unrankedBooks: [],
    };

    it("должен создать новый тир-лист с 5 тирами по умолчанию", async () => {
      (prisma.tierList.create as any).mockResolvedValue(mockCreatedTierList);

      const result = await service.createTierList(mockUserId, mockTitle);

      expect(prisma.tierList.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          title: mockTitle,
          isPublic: false,
          tiers: {
            create: [
              { title: "S", color: "#FF6B6B", rank: 0 },
              { title: "A", color: "#4ECDC4", rank: 1 },
              { title: "B", color: "#45B7D1", rank: 2 },
              { title: "C", color: "#96CEB4", rank: 3 },
              { title: "D", color: "#FFEAA7", rank: 4 },
            ],
          },
        },
        include: {
          tiers: {
            orderBy: { rank: "asc" },
            include: {
              items: { orderBy: { rank: "asc" }, include: { book: true } },
            },
          },
          placements: {
            where: { tierId: null },
            include: { book: true },
            orderBy: { rank: "asc" },
          },
        },
      });

      expect(result).toMatchObject({
        id: mockCreatedTierList.id,
        userId: mockCreatedTierList.userId,
        title: mockCreatedTierList.title,
        isPublic: mockCreatedTierList.isPublic,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        tiers: expect.arrayContaining([
          expect.objectContaining({ title: "S", rank: 0 }),
        ]),
        unrankedBooks: [],
      });
    });

    it("должен вернуть тир-лист с unrankedBooks", async () => {
      const tierListWithUnranked = {
        ...mockCreatedTierList,
        placements: [
          {
            id: 1,
            book: { id: 1, title: "Book 1", coverImageUrl: "cover.jpg" },
            tierId: null,
            rank: 0,
          },
        ],
      };

      (prisma.tierList.create as any).mockResolvedValue(tierListWithUnranked);

      const result = await service.createTierList(mockUserId, mockTitle);

      expect(result.unrankedBooks).toHaveLength(1);
      expect(result.unrankedBooks[0].book.title).toBe("Book 1");
    });
  });

  describe("assertOwner", () => {
    const mockTierListId = 1;
    const mockUserId = 1;

    it("должен завершиться успешно если пользователь владелец", async () => {
      (prisma.tierList.findUnique as any).mockResolvedValue({
        userId: mockUserId,
      });

      await expect(
        service.assertOwner(mockTierListId, mockUserId),
      ).resolves.toBeUndefined();
    });

    it("должен бросить ошибку 403 если тир-лист не принадлежит пользователю", async () => {
      (prisma.tierList.findUnique as any).mockResolvedValue({ userId: 999 });

      const error = await service
        .assertOwner(mockTierListId, mockUserId)
        .catch((e) => e);

      expect(error.message).toBe("Forbidden");
      expect(error.statusCode).toBe(403);
    });

    it("должен бросить ошибку 403 если тир-лист не найден", async () => {
      (prisma.tierList.findUnique as any).mockResolvedValue(null);

      const error = await service
        .assertOwner(mockTierListId, mockUserId)
        .catch((e) => e);

      expect(error.message).toBe("Forbidden");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("getFullTierList", () => {
    const mockTierListId = 1;

    const mockFullTierList = {
      id: mockTierListId,
      userId: 1,
      title: "Test List",
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 1, username: "testuser", avatarUrl: null },
      tiers: [
        {
          id: 1,
          title: "S",
          color: "#FF6B6B",
          rank: 0,
          items: [{ id: 1, book: { id: 1, title: "Book 1" } }],
        },
      ],
      placements: [
        {
          id: 2,
          book: { id: 2, title: "Unranked Book" },
          tierId: null,
          rank: 0,
        },
      ],
      likesCount: 10,
    };

    it("должен вернуть полный тир-лист с тирами и книгами", async () => {
      (prisma.tierList.findUniqueOrThrow as any).mockResolvedValue(
        mockFullTierList,
      );

      const result = await service.getFullTierList(mockTierListId);

      expect(prisma.tierList.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: mockTierListId },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          tiers: {
            orderBy: { rank: "asc" },
            include: {
              items: { orderBy: { rank: "asc" }, include: { book: true } },
            },
          },
          placements: {
            where: { tierId: null },
            include: { book: true },
            orderBy: { rank: "asc" },
          },
        },
      });

      expect(result).toMatchObject({
        id: mockFullTierList.id,
        userId: mockFullTierList.userId,
        title: mockFullTierList.title,
        isPublic: mockFullTierList.isPublic,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        user: mockFullTierList.user,
        tiers: expect.arrayContaining([
          expect.objectContaining({ title: "S", rank: 0 }),
        ]),
        unrankedBooks: expect.any(Array),
        likesCount: 10,
      });
    });

    it("должен бросить ошибку если тир-лист не найден", async () => {
      (prisma.tierList.findUniqueOrThrow as any).mockImplementation(() => {
        throw new Error("Record not found");
      });

      await expect(service.getFullTierList(mockTierListId)).rejects.toThrow(
        "Record not found",
      );
    });
  });

  describe("updatePlacements", () => {
    const mockTierListId = 1;
    const mockPlacements = [
      { bookId: 1, tierId: 1, rank: 0 },
      { bookId: 2, tierId: 2, rank: 1 },
      { bookId: 3, tierId: null, rank: 2 },
    ];

    it("должен обновить позиции книг используя upsert", async () => {
      (prisma.bookPlacement.findMany as any).mockResolvedValue([
        { bookId: 1 }, { bookId: 2 }, { bookId: 3 }
      ]);
      (prisma.tier.findMany as any).mockResolvedValue([
        { id: 1 }, { id: 2 }
      ]);
      (prisma.bookPlacement.upsert as any).mockResolvedValue({});

      await service.updatePlacements(mockTierListId, mockPlacements);

      expect(prisma.bookPlacement.upsert).toHaveBeenCalledTimes(3);
      expect(prisma.bookPlacement.upsert).toHaveBeenCalledWith({
        where: { tierListId_bookId: { tierListId: mockTierListId, bookId: 1 } },
        update: { tierId: 1, rank: 0 },
        create: {
          tierListId: mockTierListId,
          bookId: 1,
          tierId: 1,
          rank: 0,
        },
      });
    });

    it("должен вернуть пустой массив если placements пустой", async () => {
      const result = await service.updatePlacements(mockTierListId, []);

      expect(result).toEqual([]);
      expect(prisma.bookPlacement.upsert).not.toHaveBeenCalled();
    });

    it("должен использовать транзакцию для всех обновлений", async () => {
      (prisma.bookPlacement.findMany as any).mockResolvedValue([
        { bookId: 1 }, { bookId: 2 }, { bookId: 3 }
      ]);
      (prisma.tier.findMany as any).mockResolvedValue([
        { id: 1 }, { id: 2 }
      ]);
      (prisma.$transaction as any).mockResolvedValue([{}, {}, {}]);

      await service.updatePlacements(mockTierListId, mockPlacements);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("addBooksToTierList", () => {
    const mockTierListId = 1;
    const mockBooks = [
      {
        title: "Book 1",
        author: "Author 1",
        coverImageUrl: "cover1.jpg",
        description: "Description 1",
        thoughts: "Thoughts 1",
      },
      {
        title: "Book 2",
        author: "Author 2",
        coverImageUrl: "cover2.jpg",
      },
    ];

    const mockCreatedBooks = [
      { id: 1, ...mockBooks[0] },
      { id: 2, ...mockBooks[1] },
    ];

    const mockPlacements = [
      {
        tierListId: mockTierListId,
        bookId: 1,
        tierId: null,
        rank: 0,
        book: mockCreatedBooks[0],
      },
      {
        tierListId: mockTierListId,
        bookId: 2,
        tierId: null,
        rank: 1,
        book: mockCreatedBooks[1],
      },
    ];

    it("должен добавить книги в тир-лист (оптимизировано Bolt)", async () => {
      (prisma.bookPlacement.count as any).mockResolvedValue(0);

      // Mock tx.tierList.update return value
      (prisma.tierList.update as any).mockResolvedValue({
        placements: mockPlacements,
      });

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        return fn(prisma);
      });

      const result = await service.addBooksToTierList(mockTierListId, mockBooks);

      expect(prisma.tierList.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTierListId },
          data: expect.objectContaining({
            placements: {
              create: expect.any(Array),
            },
          }),
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].book.title).toBe("Book 1");
      expect(result[1].book.title).toBe("Book 2");
    });

    it("должен бросить ошибку при превышении лимита книг", async () => {
      (prisma.bookPlacement.count as any).mockResolvedValue(19);

      const tooManyBooks = Array(5)
        .fill(null)
        .map((_, i) => ({
          title: `Book ${i}`,
          coverImageUrl: `cover${i}.jpg`,
        }));

      await expect(
        service.addBooksToTierList(mockTierListId, tooManyBooks),
      ).rejects.toThrow("Превышен лимит книг в тир-листе");
    });

    it("должен вернуть пустой массив если books пустой", async () => {
      const result = await service.addBooksToTierList(mockTierListId, []);

      expect(result).toEqual([]);
    });

    it("должен сохранить порядок книг при добавлении (оптимизировано Bolt)", async () => {
      (prisma.bookPlacement.count as any).mockResolvedValue(5);

      (prisma.tierList.update as any).mockResolvedValue({
        placements: [mockPlacements[0]],
      });

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        return fn(prisma);
      });

      await service.addBooksToTierList(mockTierListId, [mockBooks[0]]);

      expect(prisma.tierList.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            placements: {
              create: [
                expect.objectContaining({
                  rank: 5, // existingBooksCount + index
                }),
              ],
            },
          }),
        }),
      );
    });
  });

  describe("updateBook", () => {
    const mockBookId = 1;
    const mockUpdateData = {
      title: "Updated Title",
      description: "Updated Description",
    };

    it("должен обновить книгу", async () => {
      const mockUpdatedBook = { id: mockBookId, ...mockUpdateData };
      (prisma.bookPlacement.findUniqueOrThrow as any).mockResolvedValue({});
      (prisma.book.update as any).mockResolvedValue(mockUpdatedBook);

      const result = await service.updateBook(1, mockBookId, mockUpdateData);

      expect(prisma.bookPlacement.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { tierListId_bookId: { tierListId: 1, bookId: mockBookId } },
      });

      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: mockBookId },
        data: mockUpdateData,
      });

      expect(result).toEqual(mockUpdatedBook);
    });
  });

  describe("updateBookCover", () => {
    const mockBookId = 1;
    const mockCoverUrl = "https://example.com/new-cover.jpg";

    it("должен обновить обложку книги", async () => {
      (prisma.bookPlacement.findUniqueOrThrow as any).mockResolvedValue({});
      (prisma.book.update as any).mockResolvedValue({
        id: mockBookId,
        coverImageUrl: mockCoverUrl,
      });

      const result = await service.updateBookCover(1, mockBookId, mockCoverUrl);

      expect(prisma.bookPlacement.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { tierListId_bookId: { tierListId: 1, bookId: mockBookId } },
      });

      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: mockBookId },
        data: { coverImageUrl: mockCoverUrl },
      });
    });
  });

  describe("removeBookFromTierList", () => {
    const mockTierListId = 1;
    const mockBookId = 1;

    it("должен удалить книгу из тир-листа", async () => {
      (prisma.bookPlacement.delete as any).mockResolvedValue({});

      await service.removeBookFromTierList(mockTierListId, mockBookId);

      expect(prisma.bookPlacement.delete).toHaveBeenCalledWith({
        where: {
          tierListId_bookId: {
            tierListId: mockTierListId,
            bookId: mockBookId,
          },
        },
      });
    });
  });

  describe("deleteTierList", () => {
    const mockTierListId = 1;

    it("должен удалить тир-лист", async () => {
      (prisma.tierList.delete as any).mockResolvedValue({});

      await service.deleteTierList(mockTierListId);

      expect(prisma.tierList.delete).toHaveBeenCalledWith({
        where: { id: mockTierListId },
      });
    });
  });

  describe("saveTiers", () => {
    const mockTierListId = 1;

    const mockTiersArray = [
      { id: 1, title: "S", color: "#FF6B6B", rank: 0 },
      { id: 2, title: "A", color: "#4ECDC4", rank: 1 },
    ];

    const mockAllTiers = [
      ...mockTiersArray,
      { id: 3, title: "NEW", color: "#000000", rank: 2 },
    ];

    it("должен сохранить тиры в формате full array", async () => {
      (prisma.$transaction as any).mockResolvedValue(mockAllTiers);

      const result = await service.saveTiers(mockTierListId, mockTiersArray);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toHaveLength(3);
    });

    it("должен сохранить тиры в формате diff (added)", async () => {
      (prisma.$transaction as any).mockImplementation(async (fn) => {
        // Вызываем функцию транзакции с моками
        return fn(prisma);
      });

      // Мокаем createMany для вызова внутри транзакции
      (prisma.tier.createMany as any).mockResolvedValue({ count: 1 });

      // Мокаем findMany для возврата всех тиров (2 существующих + 1 новый = 3)
      (prisma.tier.findMany as any).mockResolvedValue([
        {
          id: 1,
          title: "S",
          color: "#FF6B6B",
          rank: 0,
          tierListId: mockTierListId,
        },
        {
          id: 2,
          title: "A",
          color: "#4ECDC4",
          rank: 1,
          tierListId: mockTierListId,
        },
        {
          id: 3,
          title: "NEW",
          color: "#000000",
          rank: 2,
          tierListId: mockTierListId,
        },
      ]);

      const diffTiers = {
        added: [{ title: "NEW", color: "#000000", rank: 2 }],
        updated: [],
        deletedIds: [],
      };

      const result = await service.saveTiers(mockTierListId, diffTiers);

      expect(prisma.tier.createMany).toHaveBeenCalledWith({
        data: [
          {
            title: "NEW",
            color: "#000000",
            rank: 2,
            tierListId: mockTierListId,
          },
        ],
      });
      expect(result).toHaveLength(3);
    });

    it("должен сохранить тиры в формате diff (updated)", async () => {
      (prisma.$transaction as any).mockImplementation(async (fn) => {
        return fn(prisma);
      });

      (prisma.tier.update as any).mockResolvedValue({});

      const diffTiers = {
        added: [],
        updated: [{ id: 1, title: "S+", color: "#FF0000", rank: 0 }],
        deletedIds: [],
      };

      await service.saveTiers(mockTierListId, diffTiers);

      expect(prisma.tier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: "S+", color: "#FF0000", rank: 0 },
      });
    });

    it("должен сохранить тиры в формате diff (deleted)", async () => {
      (prisma.$transaction as any).mockImplementation(async (fn) => {
        return fn(prisma);
      });

      (prisma.tier.deleteMany as any).mockResolvedValue({ count: 2 });

      const diffTiers = {
        added: [],
        updated: [],
        deletedIds: [1, 2],
      };

      await service.saveTiers(mockTierListId, diffTiers);

      expect(prisma.tier.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] }, tierListId: mockTierListId },
      });
    });

    it("должен вернуть пустой массив если все операции пустые", async () => {
      (prisma.$transaction as any).mockResolvedValue([]);

      const result = await service.saveTiers(mockTierListId, {
        added: [],
        updated: [],
        deletedIds: [],
      });

      expect(result).toEqual([]);
    });
  });

  describe("togglePublic", () => {
    const mockTierListId = 1;

    it("должен переключить статус публичности", async () => {
      (prisma.tierList.update as any).mockResolvedValue({
        id: mockTierListId,
        isPublic: true,
      });

      const result = await service.togglePublic(mockTierListId, true);

      expect(prisma.tierList.update).toHaveBeenCalledWith({
        where: { id: mockTierListId },
        data: { isPublic: true },
        select: { id: true, isPublic: true },
      });

      expect(result).toEqual({ id: mockTierListId, isPublic: true });
    });
  });

  describe("getPublicTierLists", () => {
    const mockQuery = { page: "1", pageSize: "10", sortBy: "updated_at" };

    const mockPublicTierLists = [
      {
        id: 1,
        title: "Public List 1",
        isPublic: true,
        likesCount: 10,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
        user: { id: 1, username: "user1", avatarUrl: null },
      },
      {
        id: 2,
        title: "Public List 2",
        isPublic: true,
        likesCount: 5,
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-04"),
        user: { id: 2, username: "user2", avatarUrl: null },
      },
    ];

    it("должен вернуть публичные тир-листы с пагинацией", async () => {
      (prisma.$transaction as any).mockResolvedValue([mockPublicTierLists, 2]);

      const result = await service.getPublicTierLists(mockQuery);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].likesCount).toBe(10);
      expect(result.data[1].likesCount).toBe(5);
      expect(result.meta).toMatchObject({
        totalItems: 2,
        itemCount: 2,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      });
    });

    it("должен сортировать по лайкам если sortBy=likes", async () => {
      const mockAllLists = Array(15)
        .fill(null)
        .map((_, i) => ({
          id: i + 1,
          title: `Public List ${i + 1}`,
          isPublic: true,
          likesCount: 10 - i,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 1, username: "user", avatarUrl: null },
        }));

      (prisma.$transaction as any).mockResolvedValue([mockAllLists, 15]);

      const result = await service.getPublicTierLists({
        ...mockQuery,
        sortBy: "likes",
      });

      // Первый должен иметь больше всего лайков
      expect(result.data[0].likesCount).toBeGreaterThanOrEqual(
        result.data[1].likesCount || 0,
      );
    });

    it("должен вернуть пустой массив если нет публичных тир-листов", async () => {
      (prisma.$transaction as any).mockResolvedValue([[], 0]);

      const result = await service.getPublicTierLists(mockQuery);

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });

    it("должен правильно рассчитать totalPages для пагинации", async () => {
      const largeList = Array(35)
        .fill(null)
        .map((_, i) => ({
          ...mockPublicTierLists[0],
          id: i + 1,
        }));

      (prisma.$transaction as any).mockResolvedValue([largeList, 35]);

      const result = await service.getPublicTierLists({
        page: "1",
        pageSize: "10",
        sortBy: "updated_at",
      });

      expect(result.meta.totalPages).toBe(4); // ceil(35/10) = 4
    });
  });

  describe("forkTierList", () => {
    const mockUserId = 2;
    const mockOriginalId = 1;

    const mockOriginal = {
      id: mockOriginalId,
      title: "Original List",
      userId: 1,
      isPublic: true,
      tiers: [
        { id: 10, title: "S", color: "#FF6B6B", rank: 0 },
        { id: 11, title: "A", color: "#4ECDC4", rank: 1 },
      ],
      placements: [
        {
          bookId: 100,
          tierId: 10,
          rank: 0,
          book: {
            id: 100,
            title: "Book 1",
            author: "Author 1",
            coverImageUrl: "cover1.jpg",
            description: "Desc 1",
            thoughts: "Thoughts 1",
          },
        },
      ],
    };

    it("должен создать копию тир-листа со всеми тирами и книгами (оптимизировано Bolt)", async () => {
      (prisma.tierList.findUniqueOrThrow as any).mockResolvedValue(mockOriginal);

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        return fn(prisma);
      });

      (prisma.tierList.create as any).mockResolvedValue({
        id: 2,
        title: "Original List (копия)",
        userId: mockUserId,
        tiers: [
          { id: 20, title: "S", rank: 0 },
          { id: 21, title: "A", rank: 1 },
        ],
      });

      // Mock update for nested placements/books
      (prisma.tierList.update as any).mockResolvedValue({});

      const result = await service.forkTierList(mockOriginalId, mockUserId);

      expect(prisma.tierList.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: mockOriginalId },
        include: {
          tiers: { orderBy: { rank: "asc" } },
          placements: { include: { book: true }, orderBy: { rank: "asc" } },
        },
      });

      expect(prisma.tierList.create).toHaveBeenCalled();
      expect(prisma.tierList.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: expect.objectContaining({
            placements: {
              create: expect.any(Array),
            },
          }),
        }),
      );

      expect(result.title).toBe("Original List (копия)");
      expect(result.userId).toBe(mockUserId);
    });
  });
});
