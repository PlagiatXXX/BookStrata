import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Моки для Prisma — объявляем внутри factory для vi.mock
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    tierList: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({ id: "1" }),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tier: {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn().mockImplementation((args) => {
        if (args?.where?.id?.in) {
          return Promise.resolve(args.where.id.in.length);
        }
        return Promise.resolve(1);
      }),
    },
    bookPlacement: {
      upsert: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    book: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue(null), // pre-check занятости slug в createBookWithSlug
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    author: {
      findFirst: vi.fn().mockResolvedValue(null), // по умолчанию автор не найден
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 999, ...data, slug: 'test-author', books: [], createdAt: new Date(), updatedAt: new Date() })),
    },
    $transaction: vi.fn(),
  },
}));

// Импортируем после vi.mock
import { prisma } from "../../lib/prisma.js";
import * as service from "./tierList.service.js";
import { PrismaClient, Prisma } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/index.js";

describe("tierList.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.tierList.findUnique as any).mockResolvedValue({ id: "1", userId: 5 });
    (prisma.user.findUnique as any).mockResolvedValue({ isPro: false });
    // author mock по умолчанию
    (prisma.author.findFirst as any).mockResolvedValue(null);
    (prisma.author.findMany as any).mockResolvedValue([]);
    (prisma.author.create as any).mockImplementation((data: any) =>
      Promise.resolve({ id: 999, ...data, slug: 'test-author' }),
    );
    // book.count по умолчанию — книги существуют
    (prisma.book.count as any).mockResolvedValue(1);
    // book.findMany/findFirst по умолчанию — своих книг у пользователя нет
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.book.findFirst as any).mockResolvedValue(null);
    // $queryRaw по умолчанию — дедуп среди draft ничего не находит
    (prisma.$queryRaw as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getUserTierLists", () => {
    const mockUserId = 1;
    const mockQuery = {
      page: "1",
      pageSize: "10",
      sortBy: "updated_at" as const,
    };

    const mockTierLists = [
      {
        id: "1",
        userId: mockUserId,
        slug: expect.any(String),
        title: "Test List 1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
        isPublic: true,
        likesCount: 5,
        _count: { placements: 10 },
      },
      {
        id: "2",
        userId: mockUserId,
        slug: expect.any(String),
        title: "Test List 2",
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-04"),
        isPublic: true,
        likesCount: 3,
        _count: { placements: 5 },
      },
    ];

    it("должен вернуть список тир-листов пользователя с пагинацией", async () => {
      (prisma.tierList.findMany as any).mockResolvedValue(mockTierLists);
      (prisma.tierList.count as any).mockResolvedValue(2);

      const result = await service.getUserTierLists(mockUserId, mockQuery);

      expect(prisma.tierList.findMany).toHaveBeenCalled();
      expect(prisma.tierList.count).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({
        id: "1",
        title: "Test List 1",
        likesCount: 5,
        booksCount: 10,
      });
      expect(result.meta).toMatchObject({
        totalItems: 2,
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

      (prisma.tierList.findMany as any).mockResolvedValue(largeList);
      (prisma.tierList.count as any).mockResolvedValue(25);

      const result = await service.getUserTierLists(mockUserId, {
        page: "1",
        pageSize: "10",
        sortBy: "updated_at" as const,
      });

      expect(result.meta.totalPages).toBe(3); // ceil(25/10) = 3
    });

    it("должен вернуть пустой массив если нет тир-листов", async () => {
      (prisma.tierList.findMany as any).mockResolvedValue([]);
      (prisma.tierList.count as any).mockResolvedValue(0);

      const result = await service.getUserTierLists(mockUserId, mockQuery);

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });
  });

  describe("createTierList", () => {
    const mockUserId = 1;
    const mockTitle = "My New Tier List";

    const mockCreatedTierList = {
      id: "1",
      userId: mockUserId,
      slug: expect.any(String),
      title: mockTitle,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
        tiers: [
          { id: 1, title: "Шедевр", color: "#FF6B6B", rank: 0 },
          { id: 2, title: "Отлично", color: "#4ECDC4", rank: 1 },
          { id: 3, title: "Хорошо", color: "#45B7D1", rank: 2 },
          { id: 4, title: "Средне", color: "#96CEB4", rank: 3 },
          { id: 5, title: "Плохо", color: "#FFEAA7", rank: 4 },
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
            slug: expect.any(String),
            title: mockTitle,
            isPublic: true,
            tiers: {
              create: [
                { title: "Шедевр", color: "#FF6B6B", rank: 0 },
                { title: "Отлично", color: "#4ECDC4", rank: 1 },
                { title: "Хорошо", color: "#45B7D1", rank: 2 },
                { title: "Средне", color: "#96CEB4", rank: 3 },
                { title: "Плохо", color: "#FFEAA7", rank: 4 },
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
            expect.objectContaining({ title: "Шедевр", rank: 0 }),
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
    const mockTierListId = "1";
    const mockUserId = 1;

    it("должен завершиться успешно если пользователь владелец", async () => {
      (prisma.tierList.findUnique as any).mockResolvedValue({
        userId: mockUserId,
        slug: expect.any(String),
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

    it("должен бросить ошибку 404 если тир-лист не найден", async () => {
      (prisma.tierList.findUnique as any).mockResolvedValue(null);

      const error = await service
        .assertOwner(mockTierListId, mockUserId)
        .catch((e) => e);

      expect(error.message).toBe("Тир-лист не найден");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("getFullTierList", () => {
    const mockTierListId = "1";

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
    const mockTierListId = "1";
    const mockPlacements = [
      { bookId: 1, tierId: 1, rank: 0 },
      { bookId: 2, tierId: 2, rank: 1 },
      { bookId: 3, tierId: null, rank: 2 },
    ];

    it("должен обновлять существующие placements и создавать новые (update/upsert вместо delete/recreate)", async () => {
      // В листе уже есть книги 1, 2 и 4; входящий список: 1, 2, 3 (3 — новая, 4 — исчезнувшая)
      (prisma.tier.count as any).mockResolvedValue(2);
      (prisma.bookPlacement.findMany as any).mockResolvedValue([
        { bookId: 1 },
        { bookId: 2 },
        { bookId: 4 },
      ]);
      (prisma.bookPlacement.update as any).mockResolvedValue({});
      (prisma.bookPlacement.createMany as any).mockResolvedValue({ count: 1 });
      (prisma.bookPlacement.deleteMany as any).mockResolvedValue({ count: 1 });
      (prisma.$transaction as any).mockImplementation(async (fn: any) =>
        fn(prisma),
      );

      await service.updatePlacements(mockTierListId, mockPlacements);

      // Существующие (1, 2) — UPDATE, не delete+create
      expect(prisma.bookPlacement.update).toHaveBeenCalledTimes(2);
      expect(prisma.bookPlacement.update).toHaveBeenCalledWith({
        where: {
          tierListId_bookId: { tierListId: mockTierListId, bookId: 1 },
        },
        data: { tierId: 1, rank: 0 },
      });
      expect(prisma.bookPlacement.update).toHaveBeenCalledWith({
        where: {
          tierListId_bookId: { tierListId: mockTierListId, bookId: 2 },
        },
        data: { tierId: 2, rank: 1 },
      });

      // Новая (3) — CREATE
      expect(prisma.bookPlacement.createMany).toHaveBeenCalledWith({
        data: [{ tierListId: mockTierListId, bookId: 3, tierId: null, rank: 2 }],
      });

      // Исчезнувшая (4) — DELETE только она, а не весь лист
      expect(prisma.bookPlacement.deleteMany).toHaveBeenCalledWith({
        where: { tierListId: mockTierListId, bookId: { in: [4] } },
      });
      expect(prisma.bookPlacement.deleteMany).not.toHaveBeenCalledWith({
        where: { tierListId: mockTierListId },
      });
    });

    it("не должен пересоздавать placement при reorder без изменений состава (ничего не удаляет)", async () => {
      (prisma.tier.count as any).mockResolvedValue(2);
      (prisma.bookPlacement.findMany as any).mockResolvedValue([
        { bookId: 1 },
        { bookId: 2 },
        { bookId: 3 },
      ]);
      (prisma.bookPlacement.update as any).mockResolvedValue({});
      (prisma.bookPlacement.createMany as any).mockResolvedValue({ count: 0 });
      (prisma.bookPlacement.deleteMany as any).mockResolvedValue({ count: 0 });
      (prisma.$transaction as any).mockImplementation(async (fn: any) =>
        fn(prisma),
      );

      await service.updatePlacements(mockTierListId, mockPlacements);

      expect(prisma.bookPlacement.deleteMany).not.toHaveBeenCalled();
      expect(prisma.bookPlacement.createMany).not.toHaveBeenCalled();
      expect(prisma.bookPlacement.update).toHaveBeenCalledTimes(3);
    });

    it("должен вернуть пустой массив если placements пустой", async () => {
      const result = await service.updatePlacements(mockTierListId, []);

      expect(result).toEqual([]);
      expect(prisma.bookPlacement.deleteMany).not.toHaveBeenCalled();
      expect(prisma.bookPlacement.createMany).not.toHaveBeenCalled();
    });

    it("должен использовать транзакцию для всех обновлений", async () => {
      (prisma.tier.count as any).mockResolvedValue(2);
      (prisma.bookPlacement.findMany as any).mockResolvedValue([]);
      (prisma.bookPlacement.createMany as any).mockResolvedValue({ count: 3 });
      (prisma.$transaction as any).mockImplementation(async (fn: any) =>
        fn(prisma),
      );

      await service.updatePlacements(mockTierListId, mockPlacements);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("addBooksToTierList (Фаза 2.1: link-or-create)", () => {
    const mockTierListId = "1";
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

    beforeEach(() => {
      // Каскад матчинга: канона нет → create draft (по умолчанию)
      (prisma.book.findFirst as any).mockResolvedValue(null);
      (prisma.book.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValue([]);
      (prisma.bookPlacement.findMany as any).mockResolvedValue([]);
      (prisma.book.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 100, ...data }),
      );
      (prisma.bookPlacement.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ tierListId: mockTierListId, tierId: null, ...data, book: { id: data.bookId } }),
      );
      (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
    });

    it("создаёт книгу (draft + slug) и вхождение, если канон не найден", async () => {
      const result = await service.addBooksToTierList(mockTierListId, mockBooks);

      expect(prisma.book.create).toHaveBeenCalledTimes(2);
      // draft + авто-slug
      expect(prisma.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "draft", slug: expect.any(String) }),
        }),
      );
      expect(prisma.bookPlacement.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it("возвращает пустой массив при пустом books", async () => {
      const result = await service.addBooksToTierList(mockTierListId, []);

      expect(result).toEqual([]);
    });

    it("сохраняет порядок: rank = число существующих placements + index", async () => {
      (prisma.bookPlacement.findMany as any).mockResolvedValue([
        { bookId: 1, rank: 0 },
        { bookId: 2, rank: 1 },
      ]);

      await service.addBooksToTierList(mockTierListId, [mockBooks[0]]);

      expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rank: 2 }),
        }),
      );
    });

    it("своя локальная книга матчится по (title, author) → link, каталог не участвует", async () => {
      // findExistingUserBook ищет СВОИ draft по (userId, normTitle, authorId):
      // свои книги возвращаем по draft-фильтру, published-каталог — остальным
      (prisma.book.findMany as any).mockImplementation(({ where }: any) => {
        if (where?.userId && where?.status === "draft") {
          return Promise.resolve([{ id: 7, title: "Book 1" }]);
        }
        return Promise.resolve([
          {
            id: 320,
            title: "Book 1",
            author: "Author 1",
            authorId: 999,
            coverImageUrl: "/catalog.jpg",
            slug: "book-1",
            status: "published",
          },
        ]);
      });

      const result = await service.addBooksToTierList(mockTierListId, [mockBooks[0]]);

      expect(prisma.book.create).not.toHaveBeenCalled();
      expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bookId: 7, thoughts: "Thoughts 1" }),
        }),
      );
      expect(result[0]?.book?.id).toBe(7);
    });

    it("своей книги нет → создаётся личный оригинал (userId владельца), каталог не участвует", async () => {
      // В каталоге есть published-книга с тем же названием, своих draft нет →
      // create личной книги с userId, каталог не используется
      (prisma.book.findMany as any).mockImplementation(({ where }: any) => {
        if (where?.userId && where?.status === "draft") {
          return Promise.resolve([]);
        }
        return Promise.resolve([
          {
            id: 320,
            title: "Book 1",
            author: "Author 1",
            authorId: 999,
            coverImageUrl: "/catalog.jpg",
            slug: "book-1",
            status: "published",
          },
        ]);
      });

      const result = await service.addBooksToTierList(mockTierListId, [mockBooks[0]]);

      expect(prisma.book.create).toHaveBeenCalledTimes(1);
      expect(prisma.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "draft",
            userId: 5,
            slug: expect.any(String),
          }),
        }),
      );
      expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bookId: 100, thoughts: "Thoughts 1" }),
        }),
      );
      expect(result[0]?.book?.id).toBe(100);
    });

    it("внешняя книга уже есть в листе → обновляет позицию, не создаёт дубль вхождения", async () => {
      (prisma.bookPlacement.findMany as any).mockResolvedValue([{ bookId: 7, rank: 0 }]);
      // Дедуп по (source, externalId): книга найдена среди draft
      (prisma.book.findFirst as any).mockResolvedValueOnce({ id: 7 });
      (prisma.bookPlacement.update as any).mockResolvedValue({
        tierListId: mockTierListId,
        bookId: 7,
        rank: 1,
        book: { id: 7 },
      });

      await service.addBooksToTierList(mockTierListId, [
        {
          title: "Book 1",
          author: "Author 1",
          coverImageUrl: "cover1.jpg",
          externalId: "vol-123",
          source: "google_books",
        },
      ]);

      expect(prisma.bookPlacement.update).toHaveBeenCalled();
      expect(prisma.bookPlacement.create).not.toHaveBeenCalled();
    });

    it("externalId+source прокидываются в создаваемую книгу", async () => {
      await service.addBooksToTierList(mockTierListId, [
        {
          title: "1984",
          author: "Orwell",
          coverImageUrl: "cover.jpg",
          externalId: "vol-123",
          source: "google_books",
        },
      ]);

      expect(prisma.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ externalId: "vol-123", source: "google_books" }),
        }),
      );
    });
  });

  describe("updateBookPlacement (Фаза 2.3: вхождение)", () => {
    const mockBookId = 1;

    it("должен обновить личные данные вхождения (thoughts/coverImageUrl)", async () => {
      const mockUpdatedPlacement = { id: mockBookId, thoughts: "Мысли", coverImageUrl: "cover.jpg", book: {} };
      (prisma.bookPlacement.findUnique as any).mockResolvedValue({});
      (prisma.bookPlacement.update as any).mockResolvedValue(mockUpdatedPlacement);

      const result = await service.updateBookPlacement("1", mockBookId, {
        thoughts: "Мысли",
        coverImageUrl: "cover.jpg",
      });

      expect(prisma.bookPlacement.findUnique).toHaveBeenCalledWith({
        where: { tierListId_bookId: { tierListId: "1", bookId: mockBookId } },
      });

      expect(prisma.bookPlacement.update).toHaveBeenCalledWith({
        where: { tierListId_bookId: { tierListId: "1", bookId: mockBookId } },
        data: { thoughts: "Мысли", coverImageUrl: "cover.jpg" },
        include: { book: true },
      });

      expect(result).toEqual(mockUpdatedPlacement);
      // Каталог (глобальная Book) не трогается
      expect(prisma.book.update).not.toHaveBeenCalled();
    });

    it("coverImageUrl = null → сброс на обложку каталога", async () => {
      (prisma.bookPlacement.findUnique as any).mockResolvedValue({});
      (prisma.bookPlacement.update as any).mockResolvedValue({});

      await service.updateBookPlacement("1", mockBookId, { coverImageUrl: null });

      expect(prisma.bookPlacement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { coverImageUrl: null } }),
      );
    });

    it("должен вернуть 404 если BookPlacement отсутствует", async () => {
      (prisma.bookPlacement.findUnique as any).mockResolvedValue(null);

      await expect(
        service.updateBookPlacement("1", mockBookId, { thoughts: "Мысли" }),
      ).rejects.toMatchObject({
        message: "Book does not belong to this tier list",
        statusCode: 404,
      });
    });
  });

  describe("updateBookCatalog (Фаза 2.3: каталог-эталон)", () => {
    const mockBookId = 1;

    it("должен обновить каталог без проверки вхождения", async () => {
      const mockUpdatedBook = { id: mockBookId, title: "Updated Title" };
      (prisma.book.update as any).mockResolvedValue(mockUpdatedBook);

      const result = await service.updateBookCatalog(mockBookId, {
        title: "Updated Title",
        description: "Updated Description",
      });

      expect(prisma.bookPlacement.findUnique).not.toHaveBeenCalled();
      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: mockBookId },
        data: expect.objectContaining({ title: "Updated Title", description: "Updated Description" }),
      });
      expect(result).toEqual(mockUpdatedBook);
    });

    it("переданный автор резолвится в authorId реестра", async () => {
      (prisma.author.findFirst as any).mockResolvedValue(null);
      (prisma.author.create as any).mockResolvedValue({ id: 555 });
      (prisma.book.update as any).mockResolvedValue({ id: mockBookId });

      await service.updateBookCatalog(mockBookId, { author: "Новый Автор" });

      const updateCall = (prisma.book.update as any).mock.calls[0][0];
      expect(updateCall.data.authorId).toBe(555);
    });

    it("author: null → authorId = null", async () => {
      (prisma.book.update as any).mockResolvedValue({ id: mockBookId });

      await service.updateBookCatalog(mockBookId, { author: null });

      const updateCall = (prisma.book.update as any).mock.calls[0][0];
      expect(updateCall.data.authorId).toBeNull();
    });
  });

  describe("removeBookFromTierList", () => {
    const mockTierListId = "1";
    const mockBookId = 1;

    it("должен удалить книгу из тир-листа", async () => {
      (prisma.bookPlacement.deleteMany as any).mockResolvedValue({ count: 1 });
      (prisma.book.delete as any).mockResolvedValue({});

      await service.removeBookFromTierList(mockTierListId, mockBookId);

      expect(prisma.bookPlacement.deleteMany).toHaveBeenCalledWith({
        where: { tierListId: mockTierListId, bookId: mockBookId },
      });
    });

    it("НЕ должен удалять саму книгу из каталога (Фаза 2.2)", async () => {
      (prisma.bookPlacement.deleteMany as any).mockResolvedValue({ count: 1 });
      (prisma.book.delete as any).mockResolvedValue({});

      await service.removeBookFromTierList(mockTierListId, mockBookId);

      expect(prisma.book.delete).not.toHaveBeenCalled();
    });

    it("не должен падать если запись уже удалена", async () => {
      (prisma.bookPlacement.deleteMany as any).mockResolvedValue({ count: 0 });
      (prisma.book.delete as any).mockResolvedValue({});

      await expect(
        service.removeBookFromTierList(mockTierListId, mockBookId),
      ).resolves.not.toThrow();

      expect(prisma.bookPlacement.deleteMany).toHaveBeenCalledWith({
        where: { tierListId: mockTierListId, bookId: mockBookId },
      });
    });
  });

  describe("deleteTierList", () => {
    const mockTierListId = "1";

    it("должен удалить тир-лист и личные книги без других привязок", async () => {
      // 1-й findUnique — resolveTierListId (id); 2-й — владелец + вхождения
      (prisma.tierList.findUnique as any).mockResolvedValueOnce({ id: "1" });
      (prisma.tierList.findUnique as any).mockResolvedValueOnce({
        id: "1",
        userId: 5,
        placements: [{ bookId: 10 }, { bookId: 11 }, { bookId: 11 }],
      });
      (prisma.tierList.delete as any).mockResolvedValue({});

      await service.deleteTierList(mockTierListId);

      // Владелец листа известен → чистим его личные книги без хвостов
      expect(prisma.tierList.delete).toHaveBeenCalledWith({
        where: { id: mockTierListId },
      });
      expect(prisma.book.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: [10, 11] },
          userId: 5,
          placements: { none: {} },
        },
      });
    });

    it("удаление без вхождений → deleteMany не вызывается", async () => {
      (prisma.tierList.findUnique as any).mockResolvedValueOnce({ id: "1" });
      (prisma.tierList.findUnique as any).mockResolvedValueOnce({
        id: "1",
        userId: 5,
        placements: [],
      });
      (prisma.tierList.delete as any).mockResolvedValue({});

      await service.deleteTierList(mockTierListId);

      expect(prisma.tierList.delete).toHaveBeenCalledTimes(1);
      expect(prisma.book.deleteMany).not.toHaveBeenCalled();
    });

    it("несуществующий тир-лист → NotFoundError, delete не вызывается", async () => {
      (prisma.tierList.findUnique as any).mockResolvedValueOnce(null);

      await expect(service.deleteTierList("999")).rejects.toThrow("not found");
      expect(prisma.tierList.delete).not.toHaveBeenCalled();
    });
  });

  describe("saveTiers", () => {
    const mockTierListId = "1";

    const mockTiersArray = [
      { id: 1, title: "S", color: "#FF6B6B", rank: 0 },
      { id: 2, title: "A", color: "#4ECDC4", rank: 1 },
    ];

    it("должен сохранить тиры в формате full array", async () => {
      (prisma.$transaction as any).mockImplementation(
        async (fn: (tx: any) => any) => fn(prisma),
      );
      (prisma.tier.updateMany as any).mockResolvedValue({ count: 1 });

      const result = await service.saveTiers(mockTierListId, mockTiersArray);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toHaveLength(2);
    });

    it("должен сохранить тиры в формате diff (added)", async () => {
      (prisma.$transaction as any).mockImplementation(
        async (fn: (tx: any) => any) => fn(prisma),
      );

      (prisma.tier.create as any).mockResolvedValue({
        id: 3,
        title: "NEW",
        color: "#000000",
        rank: 2,
      });

      const diffTiers = {
        added: [{ title: "NEW", color: "#000000", rank: 2 }],
        updated: [],
        deletedIds: [],
      };

      const result = await service.saveTiers(mockTierListId, diffTiers);

      expect(prisma.tier.create).toHaveBeenCalledWith({
        data: {
          title: "NEW",
          color: "#000000",
          rank: 2,
          tierListId: mockTierListId,
        },
      });
      expect(result).toHaveLength(1);
    });

    it("должен сохранить тиры в формате diff (updated)", async () => {
      (prisma.$transaction as any).mockImplementation(
        async (
          fn: (
            arg0: PrismaClient<
              Prisma.PrismaClientOptions,
              never,
              Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined,
              DefaultArgs
            >,
          ) => any,
        ) => {
          return fn(prisma);
        },
      );

      (prisma.tier.updateMany as any).mockResolvedValue({ count: 1 });

      const diffTiers = {
        added: [],
        updated: [{ id: 1, title: "S+", color: "#FF0000", rank: 0 }],
        deletedIds: [],
      };

      await service.saveTiers(mockTierListId, diffTiers);

      expect(prisma.tier.updateMany).toHaveBeenCalledWith({
        where: { id: 1, tierListId: mockTierListId },
        data: { title: "S+", color: "#FF0000", rank: 0 },
      });
    });

    it("должен сохранить тиры в формате diff (deleted)", async () => {
      (prisma.$transaction as any).mockImplementation(
        async (
          fn: (
            arg0: PrismaClient<
              Prisma.PrismaClientOptions,
              never,
              Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined,
              DefaultArgs
            >,
          ) => any,
        ) => {
          return fn(prisma);
        },
      );

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
    const mockTierListId = "1";

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
    const mockQuery = {
      page: "1",
      pageSize: "10",
      sortBy: "updated_at" as const,
    };

    const mockPublicTierLists = [
      {
        id: "1",
        title: "Public List 1",
        isPublic: true,
        likesCount: 10,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
        user: { id: 1, username: "user1", avatarUrl: null },
        _count: { placements: 5 },
      },
      {
        id: "2",
        title: "Public List 2",
        isPublic: true,
        likesCount: 5,
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-04"),
        user: { id: 2, username: "user2", avatarUrl: null },
        _count: { placements: 3 },
      },
    ];

    it("должен вернуть публичные тир-листы с пагинацией", async () => {
      (prisma.tierList.findMany as any).mockResolvedValue(mockPublicTierLists);
      (prisma.tierList.count as any).mockResolvedValue(2);

      const result = await service.getPublicTierLists(mockQuery);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].likesCount).toBe(10);
      expect(result.data[1].likesCount).toBe(5);
      expect(result.meta).toMatchObject({
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
      });
    });

    it("должен сортировать по лайкам если sortBy=likes", async () => {
      const mockAllLists = Array(15)
        .fill(null)
        .map((_, i) => ({
          id: String(i + 1),
          title: `Public List ${i + 1}`,
          isPublic: true,
          likesCount: 10 - i,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 1, username: "user", avatarUrl: null },
        }));

      (prisma.tierList.findMany as any).mockResolvedValue(mockAllLists);
      (prisma.tierList.count as any).mockResolvedValue(15);

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
      (prisma.tierList.findMany as any).mockResolvedValue([]);
      (prisma.tierList.count as any).mockResolvedValue(0);

      const result = await service.getPublicTierLists(mockQuery);

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });

    it("должен правильно рассчитать totalPages для пагинации", async () => {
      const largeList = Array(35)
        .fill(null)
        .map((_, i) => ({
          ...mockPublicTierLists[0],
          id: String(i + 1),
          _count: { placements: 5 },
        }));

      (prisma.tierList.findMany as any).mockResolvedValue(largeList);
      (prisma.tierList.count as any).mockResolvedValue(35);

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
    const mockOriginalId = "1";

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
          thoughts: "Thoughts 1",
          book: {
            id: 100,
            title: "Book 1",
            author: "Author 1",
            coverImageUrl: "cover1.jpg",
            description: "Desc 1",
          },
        },
        {
          bookId: 101,
          tierId: null,
          rank: 1,
          thoughts: null,
          book: {
            id: 101,
            title: "Book 2",
            author: null,
            coverImageUrl: "cover2.jpg",
            description: null,
          },
        },
      ],
    };

    it("должен создать копию тир-листа со всеми тирами и книгами (оптимизировано Bolt)", async () => {
      (prisma.tierList.findUniqueOrThrow as any).mockResolvedValue(
        mockOriginal,
      );

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        return fn(prisma);
      });

      (prisma.tierList.create as any).mockResolvedValue({
        id: "2",
        title: "Original List (копия)",
        userId: mockUserId,
        slug: expect.any(String),
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
      const updateCall = (prisma.tierList.update as any).mock.calls[0][0];

      expect(updateCall).toEqual(
        expect.objectContaining({
          where: { id: "2" },
          data: expect.objectContaining({
            placements: {
              create: expect.any(Array),
            },
          }),
        }),
      );
      expect(updateCall.data.placements.create).toEqual([
        {
          rank: 0,
          thoughts: "Thoughts 1",
          tier: {
            connect: { id: 20 },
          },
          book: {
            create: {
              title: "Book 1",
              author: "Author 1",
              coverImageUrl: "cover1.jpg",
              description: "Desc 1",
              // Модель «личные книги»: форк принадлежит новому владельцу,
              // статус draft (не published), slug не копируется
              userId: mockUserId,
              status: "draft",
            },
          },
        },
        {
          rank: 1,
          thoughts: null,
          book: {
            create: {
              title: "Book 2",
              author: null,
              coverImageUrl: "cover2.jpg",
              description: null,
              userId: mockUserId,
              status: "draft",
            },
          },
        },
      ]);
      expect(updateCall.data.placements.create[1]).not.toHaveProperty("tierId");
      expect(updateCall.data.placements.create[1]).not.toHaveProperty("tier");

      expect(result.title).toBe("Original List (копия)");
      expect(result.userId).toBe(mockUserId);
    });

    it("should throw if tier mapping is missing for a ranked placement", async () => {
      (prisma.tierList.findUniqueOrThrow as any).mockResolvedValue({
        ...mockOriginal,
        placements: [
          {
            ...mockOriginal.placements[0],
            tierId: 11,
          },
          mockOriginal.placements[1],
        ],
      });

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        return fn(prisma);
      });

      (prisma.tierList.create as any).mockResolvedValue({
        id: 2,
        title: "Original List (копия)",
        userId: mockUserId,
        slug: expect.any(String),
        tiers: [{ id: 20, title: "S", rank: 0 }],
      });

      await expect(
        service.forkTierList(mockOriginalId, mockUserId),
      ).rejects.toThrow("Mapped tier ID not found for source tier ID: 11");
      expect(prisma.tierList.update).not.toHaveBeenCalled();
    });
  });

  describe("saveAll", () => {
    const mockTierListId = "1";
    const mockUserId = 1;

    it("должен атомарно сохранить все изменения (оптимизировано Bolt)", async () => {
      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        return fn(prisma);
      });

      // Моки для тиров
      (prisma.tier.deleteMany as any).mockResolvedValue({ count: 1 });
      (prisma.tier.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.tier.create as any).mockResolvedValue({ id: 100 });
      (prisma.tier.count as any).mockResolvedValue(1);

      (prisma.bookPlacement.count as any).mockResolvedValue(1);
      (prisma.tierList.findMany as any).mockResolvedValue([{ id: "1" }]);
      (prisma.tierList.findUnique as any).mockResolvedValue({ id: "1" });

      // Моки для книг
      (prisma.book.create as any).mockResolvedValue({ id: 200 });
      (prisma.book.findMany as any).mockResolvedValue([]);

      // Моки для размещений (Фаза 2.4: update/upsert вместо delete/recreate)
      (prisma.bookPlacement.findMany as any).mockResolvedValue([]);
      (prisma.bookPlacement.update as any).mockResolvedValue({});
      (prisma.bookPlacement.createMany as any).mockResolvedValue({ count: 2 });
      (prisma.bookPlacement.deleteMany as any).mockResolvedValue({ count: 0 });

      // Мок для обновления тир-листа
      (prisma.tierList.update as any).mockResolvedValue({});

      const payload = {
        tiers: {
          added: [
            {
              tempId: "temp-tier-1",
              title: "New Tier",
              color: "#000",
              rank: 10,
            },
          ],
          updated: [{ id: 1, title: "Updated Tier", color: "#fff", rank: 0 }],
          deletedIds: [2],
        },
        newBooks: [
          {
            tempId: "temp-book-1",
            title: "New Book",
            coverImageUrl: "img.jpg",
          },
        ],
        placements: [
          { bookId: "temp-book-1", tierId: "temp-tier-1", rank: 0 },
          { bookId: 10, tierId: 1, rank: 1 },
        ],
      };

      const result = await service.saveAll(mockTierListId, mockUserId, payload);
      // Проверка параллельного выполнения через вызовы Prisma
      expect(prisma.tier.deleteMany).toHaveBeenCalled();
      expect(prisma.tier.updateMany).toHaveBeenCalled();
      expect(prisma.tier.create).toHaveBeenCalled();
      expect(prisma.book.create).toHaveBeenCalled();
      expect(prisma.bookPlacement.findMany).toHaveBeenCalledWith({
        where: { tierListId: mockTierListId },
        select: { bookId: true, thoughts: true, coverImageUrl: true },
      });
      expect(prisma.bookPlacement.createMany).toHaveBeenCalledWith({
        data: [
          { tierListId: mockTierListId, bookId: 200, tierId: 100, rank: 0 },
          { tierListId: mockTierListId, bookId: 10, tierId: 1, rank: 1 },
        ],
      });
      expect(prisma.bookPlacement.deleteMany).not.toHaveBeenCalled();

      expect(result.bookReplacements).toContainEqual({
        tempId: "temp-book-1",
        realId: "200",
      });
      expect(result.tierReplacements).toContainEqual({
        tempId: "temp-tier-1",
        realId: "100",
      });
    });

    it("должен бросить ошибку если Real ID не найден для временного ID", async () => {
      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        return fn(prisma);
      });

      (prisma.tierList.findUnique as any).mockResolvedValue({ id: "1" });
      (prisma.bookPlacement.findMany as any).mockResolvedValue([]);

      const payload = {
        placements: [{ bookId: "missing-temp-id", tierId: null, rank: 0 }],
      };

      await expect(
        service.saveAll(mockTierListId, mockUserId, payload),
      ).rejects.toThrow("Real ID not found for temp book ID: missing-temp-id");
    });

    it("должен размещать книгу без проверки владения (книги глобальные)", async () => {
      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        return fn(prisma);
      });

      (prisma.tierList.findUnique as any).mockResolvedValue({ id: "1" });
      (prisma.bookPlacement.findMany as any).mockResolvedValue([]);
      (prisma.bookPlacement.update as any).mockResolvedValue({});
      (prisma.bookPlacement.createMany as any).mockResolvedValue({ count: 1 });
      (prisma.bookPlacement.deleteMany as any).mockResolvedValue({ count: 0 });
      (prisma.tierList.update as any).mockResolvedValue({});
      (prisma.book.findMany as any).mockResolvedValue([]);

      const payload = {
        placements: [{ bookId: 10, tierId: null, rank: 0 }],
      };

      await service.saveAll(mockTierListId, mockUserId, payload);

      // Проверка владения удалена — книга сразу идёт в createMany
      expect(prisma.tierList.findMany).not.toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(prisma.bookPlacement.createMany).toHaveBeenCalledWith({
        data: [{ tierListId: "1", bookId: 10, tierId: null, rank: 0 }],
      });
    });
  });
});
