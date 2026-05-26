import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    tierListLike: {
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    tierList: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

vi.mock('../../../repositories/index.js', () => ({
  tierListRepository: {
    findById: vi.fn(),
    resolveId: vi.fn(),
  },
}));

import { prisma } from '../../../lib/prisma.js';
import { tierListRepository } from '../../../repositories/index.js';
import * as service from './likes.service.js';

const REAL_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('likes.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('like', () => {
    it('should create a like and increment likesCount', async () => {
      (tierListRepository.resolveId as any).mockResolvedValue(REAL_ID);
      (prisma.tierListLike.findUnique as any).mockResolvedValue(null);

      await service.like('test-id', 1);

      expect(tierListRepository.resolveId).toHaveBeenCalledWith('test-id');
      expect(prisma.tierListLike.create).toHaveBeenCalledWith({
        data: { userId: 1, tierListId: REAL_ID },
      });
      expect(prisma.tierList.update).toHaveBeenCalledWith({
        where: { id: REAL_ID },
        data: { likesCount: { increment: 1 } },
      });
    });

    it('should return success if already liked (idempotent)', async () => {
      (tierListRepository.resolveId as any).mockResolvedValue(REAL_ID);
      (prisma.tierListLike.findUnique as any).mockResolvedValue({ id: 1 });

      const result = await service.like('test-id', 1);

      expect(result.success).toBe(true);
      expect(prisma.tierListLike.create).not.toHaveBeenCalled();
      expect(tierListRepository.resolveId).toHaveBeenCalledWith('test-id');
    });
  });

  describe('unlike', () => {
    it('should delete a like and decrement likesCount', async () => {
      (tierListRepository.resolveId as any).mockResolvedValue(REAL_ID);
      (prisma.tierListLike.findUnique as any).mockResolvedValue({ id: 10, userId: 1, tierListId: REAL_ID });

      await service.unlike('test-id', 1);

      expect(tierListRepository.resolveId).toHaveBeenCalledWith('test-id');
      expect(prisma.tierListLike.delete).toHaveBeenCalledWith({
        where: { userId_tierListId: { userId: 1, tierListId: REAL_ID } },
      });
      expect(prisma.tierList.update).toHaveBeenCalledWith({
        where: { id: REAL_ID },
        data: { likesCount: { decrement: 1 } },
      });
    });

    it('should return error if not liked', async () => {
      (tierListRepository.resolveId as any).mockResolvedValue(REAL_ID);
      (prisma.tierListLike.findUnique as any).mockResolvedValue(null);

      const result = await service.unlike('test-id', 1);

      expect(result.success).toBe(false);
      expect(prisma.tierListLike.delete).not.toHaveBeenCalled();
      expect(tierListRepository.resolveId).toHaveBeenCalledWith('test-id');
    });
  });

  describe('getLikesWithStatus', () => {
    it('should return likesCount and isLiked status in one query', async () => {
      (tierListRepository.findById as any).mockResolvedValue({
        likesCount: 42,
        likes: [{ id: 1 }]
      });

      const result = await service.getLikesWithStatus('slug-or-id', 1);

      expect(result.likesCount).toBe(42);
      expect(result.isLiked).toBe(true);
      expect(tierListRepository.findById).toHaveBeenCalledWith('slug-or-id', {
        select: {
          likesCount: true,
          likes: {
            where: { userId: 1 },
            select: { id: true }
          }
        }
      });
    });

    it('should handle missing userId and return isLiked as false', async () => {
      (tierListRepository.findById as any).mockResolvedValue({
        likesCount: 10,
        likes: []
      });

      const result = await service.getLikesWithStatus('slug-or-id');

      expect(result.likesCount).toBe(10);
      expect(result.isLiked).toBe(false);
      expect(tierListRepository.findById).toHaveBeenCalledWith('slug-or-id', {
        select: {
          likesCount: true,
          likes: false
        }
      });
    });

    it('should return zeros when tier list not found', async () => {
      (tierListRepository.findById as any).mockResolvedValue(null);

      const result = await service.getLikesWithStatus('nonexistent');

      expect(result.likesCount).toBe(0);
      expect(result.isLiked).toBe(false);
    });
  });
});
