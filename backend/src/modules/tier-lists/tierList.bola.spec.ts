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

  describe("updateBook BOLA", () => {
    it("should NOT allow updating a book if it doesn't belong to the tier list (FIXED)", async () => {
      const attackerTierListId = 100;
      const victimBookId = 999;

      // Tier list found
      (prisma.tierList.findUnique as any).mockResolvedValue({ id: attackerTierListId });
      // Book placement NOT found
      (prisma.bookPlacement.findUnique as any).mockResolvedValue(null);

      // Service call should fail
      await expect(
        service.updateBook(attackerTierListId, victimBookId, { title: "Hacked" }),
      ).rejects.toThrow("Book does not belong to this tier list");

      expect(prisma.book.update).not.toHaveBeenCalled();
    });

    it("should allow updating a book if it belongs to the tier list", async () => {
      const tierListId = 100;
      const bookId = 999;

      (prisma.tierList.findUnique as any).mockResolvedValue({ id: tierListId });
      (prisma.bookPlacement.findUnique as any).mockResolvedValue({ tierListId, bookId });
      (prisma.book.update as any).mockResolvedValue({ id: bookId, title: "Updated" });

      const result = await service.updateBook(tierListId, bookId, { title: "Updated" });

      expect(result.title).toBe("Updated");
      expect(prisma.book.update).toHaveBeenCalled();
    });
  });

  describe("updateBookCover BOLA", () => {
    it("should NOT allow updating a book cover if it doesn't belong to the tier list (FIXED)", async () => {
      const attackerTierListId = 100;
      const victimBookId = 999;

      // Tier list found
      (prisma.tierList.findUnique as any).mockResolvedValue({ id: attackerTierListId });
      // Book placement NOT found
      (prisma.bookPlacement.findUnique as any).mockResolvedValue(null);

      await expect(
        service.updateBookCover(attackerTierListId, victimBookId, "new-cover.jpg"),
      ).rejects.toThrow("Book does not belong to this tier list");

      expect(prisma.book.update).not.toHaveBeenCalled();
    });
  });
});
