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
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn(),
    },
    bookPlacement: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    tierList: {
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
      findUnique: vi.fn().mockResolvedValue({ id: "1" }),
    },
  },
}));

describe("Tier List BOLA Security Tests - New", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.$transaction as any).mockImplementation((cb: any) => cb(prisma));
  });

  describe("saveTiers BOLA", () => {
    it("should ensure tier updates include tierListId in the where clause", async () => {
      const myTierListId = "1";
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
      const myTierListId = "1";
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

    it("своя книга (userId = владелец) размещается напрямую", async () => {
      const myTierListId = "1";
      const myBookId = 888;

      const payload = {
        placements: [
          { bookId: myBookId, tierId: null, rank: 0 }
        ]
      };

      // Модель «личные книги»: своя книга детач не требует
      (prisma.book.findMany as any).mockResolvedValue([{ id: myBookId, userId: 1 }]);

      await expect(service.saveAll(myTierListId, 1, payload)).resolves.toBeDefined();
      expect(prisma.bookPlacement.createMany).toHaveBeenCalledWith({
        data: [{ tierListId: "1", bookId: myBookId, tierId: null, rank: 0 }],
      });
      expect(prisma.book.create).not.toHaveBeenCalled();
    });

    it("глобальная (каталоговая) книга в листе легальна — копия не создаётся (единый каталог, 19.08)", async () => {
      const myTierListId = "1";
      const globalBookId = 777;

      const payload = {
        placements: [
          { bookId: globalBookId, tierId: null, rank: 0 }
        ]
      };

      await service.saveAll(myTierListId, 1, payload);

      // Каталоговая книга не детачится: личная копия не создаётся,
      // вхождение создаётся на саму книгу
      expect(prisma.book.create).not.toHaveBeenCalled();
      expect(prisma.bookPlacement.createMany).toHaveBeenCalledWith({
        data: [{ tierListId: "1", bookId: globalBookId, tierId: null, rank: 0 }],
      });
    });
  });
});
