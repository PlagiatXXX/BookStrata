import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from './tierList.service.js';
import { prisma } from '../../lib/prisma.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
    tier: {
      deleteMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: 101 }),
      count: vi.fn().mockResolvedValue(1),
    },
    book: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({ id: 201 }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    bookPlacement: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    tierList: {
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([{ id: 123 }]),
      findUnique: vi.fn().mockResolvedValue({ id: "123" }),
    },
  },
}));

describe('tierList.service.saveAll', () => {
  const userId = 1;
  const tierListId = "123";

  beforeEach(() => {
    vi.clearAllMocks();
    // Восстанавливаем реализацию транзакции, т.к. clearAllMocks сбрасывает все mockImplementation
    (prisma.$transaction as any).mockImplementation((cb: any) => cb(prisma));
  });

  it('should save all changes in a transaction', async () => {
    (prisma.bookPlacement.count as any).mockResolvedValue(1);
    const payload = {
      tiers: {
        added: [{ tempId: 'tier-1', title: 'New Tier', color: '#ff0000', rank: 5 }],
        updated: [{ id: 10, title: 'Updated Tier', color: '#00ff00', rank: 0 }],
        deletedIds: [11],
      },
      newBooks: [
        { tempId: 'local-1', title: 'New Book', coverImageUrl: 'url' }
      ],
      placements: [
        { bookId: 'local-1', tierId: 'tier-1', rank: 0 },
        { bookId: 200, tierId: 10, rank: 1 }
      ]
    };

    const result = await service.saveAll(tierListId, userId, payload);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.tier.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [11] }, tierListId }
    });
    expect(prisma.tier.updateMany).toHaveBeenCalled();
    expect(prisma.tier.create).toHaveBeenCalled();
    expect(prisma.book.create).toHaveBeenCalled();
    expect(prisma.bookPlacement.findMany).toHaveBeenCalledWith({
      where: { tierListId },
      select: { bookId: true, thoughts: true, coverImageUrl: true },
    });
    expect(prisma.bookPlacement.createMany).toHaveBeenCalledWith({
      data: [
        { tierListId, bookId: 201, tierId: 101, rank: 0 },
        { tierListId, bookId: 200, tierId: 10, rank: 1 }
      ]
    });
    expect(prisma.bookPlacement.deleteMany).not.toHaveBeenCalled();

    expect(result.tierReplacements).toContainEqual({ tempId: 'tier-1', realId: '101' });
    expect(result.bookReplacements).toContainEqual({ tempId: 'local-1', realId: '201' });
  });

  it('should detach foreign books: personal copy with draft status, thoughts moved to new placement', async () => {
    // В листе лежит «чужая» книга (userId = null — легаси-общая / каталоговая)
    (prisma.bookPlacement.findMany as any).mockResolvedValue([
      { bookId: 200, thoughts: 'мои мысли о книге', coverImageUrl: 'cov-url' },
    ]);
    (prisma.book.findMany as any)
      .mockResolvedValueOnce([{ id: 200, userId: null }]) // детект чужих книг
      .mockResolvedValueOnce([{ // полные foreign-книги
        id: 200,
        title: 'Война и мир',
        author: 'Толстой',
        authorId: 5,
        coverImageUrl: 'url',
        description: null,
        genre: 'роман',
        tags: [],
        slug: 'voyna-i-mir',
        externalId: 'abc',
        source: 'google_books',
        status: 'published', // легаси: каталоговая книга в тир-листе
        publishedYear: 1869,
        rating: 9.5,
        likesCount: 3,
        mergedIntoId: null,
        contextChain: null,
      }]);
    (prisma.book.create as any).mockResolvedValue({ id: 999 });

    const payload = {
      placements: [{ bookId: 200, tierId: null, rank: 0 }],
    };

    await service.saveAll(tierListId, userId, payload);

    // Копия — личная, статус ВСЕГДА draft (не published как легаси-оригинал)
    expect(prisma.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          status: 'draft',
          slug: null,
          externalId: 'abc',
          source: 'google_books',
        }),
      }),
    );
    // Вхождение перепривязано на копию, мысли/обложка перенесены
    expect(prisma.bookPlacement.createMany).toHaveBeenCalledWith({
      data: [
        {
          tierListId,
          bookId: 999,
          tierId: null,
          rank: 0,
          thoughts: 'мои мысли о книге',
          coverImageUrl: 'cov-url',
        },
      ],
    });
    // Старое вхождение (на foreign-книге) удалено
    expect(prisma.bookPlacement.deleteMany).toHaveBeenCalledWith({
      where: { tierListId, bookId: { in: [200] } },
    });
  });
});
