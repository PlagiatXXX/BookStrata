import { describe, it, expect, vi, beforeEach} from "vitest";

// Моки для Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tierList: {
      findUnique: vi.fn(),
    },
    bookPlacement: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    book: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma.js";
import * as service from "./tierList.service.js";

describe("Tier List BOLA Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateBookPlacement BOLA", () => {
    it("should NOT allow updating a book if it doesn't belong to the tier list (FIXED)", async () => {
      const attackerTierListId = "100";
      const victimBookId = 999;

      // Tier list found
      (prisma.tierList.findUnique as any).mockResolvedValue({ id: attackerTierListId });
      // Book placement NOT found
      (prisma.bookPlacement.findUnique as any).mockResolvedValue(null);

      // Service call should fail
      await expect(
        service.updateBookPlacement(attackerTierListId, victimBookId, { thoughts: "Hacked" }),
      ).rejects.toThrow("Book does not belong to this tier list");

      expect(prisma.bookPlacement.update).not.toHaveBeenCalled();
      expect(prisma.book.update).not.toHaveBeenCalled();
    });

    it("should allow updating own placement (thoughts/cover), NOT the catalog", async () => {
      const tierListId = "100";
      const bookId = 999;

      (prisma.tierList.findUnique as any).mockResolvedValue({ id: tierListId });
      (prisma.bookPlacement.findUnique as any).mockResolvedValue({ tierListId, bookId });
      (prisma.bookPlacement.update as any).mockResolvedValue({ id: bookId, thoughts: "Мысли" });

      const result = await service.updateBookPlacement(tierListId, bookId, { thoughts: "Мысли" });

      expect(result.thoughts).toBe("Мысли");
      expect(prisma.bookPlacement.update).toHaveBeenCalled();
      // Каталог недоступен пользователю
      expect(prisma.book.update).not.toHaveBeenCalled();
    });
  });
});
