import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocking Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tierList: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    bookPlacement: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    book: {
      create: vi.fn(),
    },
    tier: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(vi.importActual("../../lib/prisma.js").prisma)),
  },
}));

import { prisma } from "../../lib/prisma.js";
import * as service from "./tierList.service.js";

describe("Tier List BOLA Security (saveAll & updatePlacements)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for $transaction to execute the callback
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(prisma);
      }
      return Promise.all(callback);
    });
  });

  describe("updatePlacements BOLA", () => {
    it("should NOT allow updating placement for a book NOT in the tier list (FIXED)", async () => {
      const targetTierListId = 1;
      const stolenBookId = 999; // Belongs to another user's list

      (prisma.bookPlacement.findMany as any).mockResolvedValue([{ bookId: 10 }]); // Valid books for this list
      (prisma.tier.findMany as any).mockResolvedValue([]);

      await expect(service.updatePlacements(targetTierListId, [
        { bookId: stolenBookId, tierId: null, rank: 0 }
      ])).rejects.toThrow("Forbidden: Book 999 not in list 1");

      expect(prisma.bookPlacement.upsert).not.toHaveBeenCalled();
    });

    it("should allow updating placement for a book in the tier list", async () => {
      const targetTierListId = 1;
      const bookId = 10;

      (prisma.bookPlacement.findMany as any).mockResolvedValue([{ bookId: 10 }]);
      (prisma.tier.findMany as any).mockResolvedValue([]);
      (prisma.bookPlacement.upsert as any).mockResolvedValue({});

      await service.updatePlacements(targetTierListId, [
        { bookId: bookId, tierId: null, rank: 0 }
      ]);

      expect(prisma.bookPlacement.upsert).toHaveBeenCalled();
    });
  });

  describe("saveAll BOLA", () => {
    it("should NOT allow cross-linking books from other tier lists (FIXED)", async () => {
      const targetTierListId = 1;
      const targetUserId = 1;
      const stolenBookId = 999; // From another tier list

      (prisma.bookPlacement.findMany as any).mockResolvedValue([{ bookId: 10 }]);
      (prisma.tier.findMany as any).mockResolvedValue([]);

      await expect(service.saveAll(targetTierListId, targetUserId, {
        placements: [
          { bookId: stolenBookId, tierId: null, rank: 0 }
        ]
      })).rejects.toThrow("Forbidden: Book 999 not in list 1");

      expect(prisma.bookPlacement.createMany).not.toHaveBeenCalled();
    });

    it("should allow linking books that belong to the tier list", async () => {
      const targetTierListId = 1;
      const targetUserId = 1;
      const bookId = 10;

      (prisma.bookPlacement.findMany as any).mockResolvedValue([{ bookId: 10 }]);
      (prisma.tier.findMany as any).mockResolvedValue([]);
      (prisma.bookPlacement.deleteMany as any).mockResolvedValue({});
      (prisma.bookPlacement.createMany as any).mockResolvedValue({});
      (prisma.tierList.update as any).mockResolvedValue({});

      await service.saveAll(targetTierListId, targetUserId, {
        placements: [
          { bookId: bookId, tierId: null, rank: 0 }
        ]
      });

      expect(prisma.bookPlacement.createMany).toHaveBeenCalled();
    });
  });
});
