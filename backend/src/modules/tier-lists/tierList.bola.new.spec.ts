import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../lib/prisma.js";
import * as service from "./tierList.service.js";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
    tier: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    book: {
      create: vi.fn(),
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

describe("Tier List BOLA Security Tests - New", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveTiers BOLA", () => {
    it("should ensure tier updates include tierListId in the where clause", async () => {
      const myTierListId = 1;
      const tierId = 999;

      const payload = [
        { id: tierId, title: "Update", color: "#000000", rank: 0 }
      ];

      await service.saveTiers(myTierListId, payload);

      // Now uses updateMany with tierListId check
      expect(prisma.tier.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: tierId, tierListId: myTierListId }
      }));
    });
  });

  describe("saveAll BOLA", () => {
    it("should ensure tier updates in saveAll include tierListId in the where clause", async () => {
      const myTierListId = 1;
      const tierId = 999;

      const payload = {
        tiers: {
          updated: [{ id: tierId, title: "Hacked", color: "#000000", rank: 0 }]
        }
      };

      await service.saveAll(myTierListId, 1, payload);

      expect(prisma.tier.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: tierId, tierListId: myTierListId }
      }));
    });

    it("should THROW an error if bookId in placements does not belong to the tier list", async () => {
      const myTierListId = 1;
      const someoneElsesBookId = 888;

      (prisma.bookPlacement.count as any).mockResolvedValue(0); // None of the books found in this list

      const payload = {
        placements: [
          { bookId: someoneElsesBookId, tierId: null, rank: 0 }
        ]
      };

      await expect(service.saveAll(myTierListId, 1, payload)).rejects.toThrow("One or more books do not belong to this tier list");

      expect(prisma.bookPlacement.createMany).not.toHaveBeenCalled();
    });

    it("should proceed if bookId belongs to the tier list", async () => {
      const myTierListId = 1;
      const myBookId = 777;

      (prisma.bookPlacement.count as any).mockResolvedValue(1); // One book found

      const payload = {
        placements: [
          { bookId: myBookId, tierId: null, rank: 0 }
        ]
      };

      await service.saveAll(myTierListId, 1, payload);

      expect(prisma.bookPlacement.createMany).toHaveBeenCalled();
    });
  });
});
