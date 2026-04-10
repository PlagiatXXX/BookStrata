import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    tierListLike: {
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    tierList: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

import { prisma } from '../../../lib/prisma.js';
import * as service from './likes.service.js';

describe('likes.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('like', () => {
    it('should create a like and increment likesCount', async () => {
      (prisma.tierListLike.findUnique as any).mockResolvedValue(null);

      await service.like(1, 1);

      expect(prisma.tierListLike.create).toHaveBeenCalled();
      expect(prisma.tierList.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { likesCount: { increment: 1 } },
      });
    });

    it('should return error if already liked', async () => {
      (prisma.tierListLike.findUnique as any).mockResolvedValue({ id: 1 });

      const result = await service.like(1, 1);

      expect(result.success).toBe(false);
      expect(prisma.tierListLike.create).not.toHaveBeenCalled();
    });
  });

  describe('unlike', () => {
    it('should delete a like and decrement likesCount', async () => {
      (prisma.tierListLike.findUnique as any).mockResolvedValue({ id: 10, userId: 1, tierListId: 1 });

      await service.unlike(1, 1);

      expect(prisma.tierListLike.delete).toHaveBeenCalledWith({
        where: { userId_tierListId: { userId: 1, tierListId: 1 } },
      });
      expect(prisma.tierList.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { likesCount: { decrement: 1 } },
      });
    });

    it('should return error if not liked', async () => {
      (prisma.tierListLike.findUnique as any).mockResolvedValue(null);

      const result = await service.unlike(1, 1);

      expect(result.success).toBe(false);
      expect(prisma.tierListLike.delete).not.toHaveBeenCalled();
    });
  });

  describe('getLikesWithStatus', () => {
    it('should return likesCount from tierList table', async () => {
      (prisma.tierList.findUnique as any).mockResolvedValue({ likesCount: 42 });

      const result = await service.getLikesWithStatus(1);

      expect(result.likesCount).toBe(42);
      expect(prisma.tierList.findUnique).toHaveBeenCalled();
    });
  });
});
