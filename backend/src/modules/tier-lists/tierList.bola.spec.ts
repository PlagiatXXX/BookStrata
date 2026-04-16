import { describe, it, expect, vi, beforeEach } from "vitest";

// Моки для Prisma
vi.mock("../../lib/prisma.js", () => {
  const prismaMock = {
    tier: {
      update: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    tierList: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bookPlacement: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    book: {
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prismaMock);
    }),
  };
  return { prisma: prismaMock };
});

import { prisma } from "../../lib/prisma.js";
import * as service from "./tierList.service.js";

describe("Tier List BOLA Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveTiers BOLA", () => {
    it("should enforce tierListId when updating tiers", async () => {
      const tierListId = 1;
      const otherTierId = 999;

      const tiers = {
        added: [],
        updated: [{ id: otherTierId, title: "Hacked", color: "#000", rank: 1 }],
        deletedIds: []
      };

      (prisma.tier.findMany as any).mockResolvedValue([]);

      await service.saveTiers(tierListId, tiers);

      expect(prisma.tier.update).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: otherTierId, tierListId })
      }));
    });
  });

  describe("updatePlacements BOLA", () => {
    it("should validate that all bookIds and tierIds belong to the tierListId", async () => {
      const tierListId = 1;
      const maliciousBookId = 777;
      const maliciousTierId = 666;

      const placements = [
        { bookId: maliciousBookId, tierId: maliciousTierId, rank: 0 }
      ];

      // In the fixed version, this should throw a Forbidden or similar error
      // if the books/tiers don't belong to the tier list.
      // We'll mock findMany for BOLA validation to return fewer items than requested
      (prisma.bookPlacement.findMany as any).mockResolvedValue([]); // No placements found for these IDs in this list

      await expect(service.updatePlacements(tierListId, placements))
        .rejects.toThrow(/Forbidden|Access denied|not found/i);
    });
  });

  describe("saveAll BOLA", () => {
    it("should enforce tierListId for tier updates and deletes", async () => {
      const tierListId = 1;
      const userId = 42;
      const otherTierId = 999;

      const payload = {
        tiers: {
          updated: [{ id: otherTierId, title: "Hacked", color: "#000", rank: 1 }],
          deletedIds: [888]
        }
      };

      await service.saveAll(tierListId, userId, payload);

      expect(prisma.tier.update).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: otherTierId, tierListId })
      }));

      expect(prisma.tier.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: { in: [888] }, tierListId })
      }));
    });

    it("should validate existing bookIds in placements belong to the tierListId", async () => {
      const tierListId = 1;
      const userId = 42;
      const maliciousBookId = 777;

      const payload = {
        placements: [
          { bookId: maliciousBookId, tierId: null, rank: 0 }
        ]
      };

      // Mock validation failing (finding 0 matches for 1 requested book)
      (prisma.bookPlacement.findMany as any).mockResolvedValue([]);

      await expect(service.saveAll(tierListId, userId, payload))
        .rejects.toThrow(/Forbidden|Access denied|not found/i);
    });
  });
});
