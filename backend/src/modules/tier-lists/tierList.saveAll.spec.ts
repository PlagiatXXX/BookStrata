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
    },
    book: {
      create: vi.fn().mockResolvedValue({ id: 201 }),
    },
    bookPlacement: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    tierList: {
      update: vi.fn(),
    },
  },
}));

describe('tierList.service.saveAll', () => {
  const userId = 1;
  const tierListId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(prisma.bookPlacement.deleteMany).toHaveBeenCalledWith({ where: { tierListId } });
    expect(prisma.bookPlacement.createMany).toHaveBeenCalledWith({
      data: [
        { tierListId, bookId: 201, tierId: 101, rank: 0 },
        { tierListId, bookId: 200, tierId: 10, rank: 1 }
      ]
    });

    expect(result.tierReplacements).toContainEqual({ tempId: 'tier-1', realId: '101' });
    expect(result.bookReplacements).toContainEqual({ tempId: 'local-1', realId: '201' });
  });
});
