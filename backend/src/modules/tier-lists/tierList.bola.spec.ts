import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

  describe("updateBook BOLA", () => {
    it("should NOT allow updating a book if it doesn't belong to the tier list (FIXED)", async () => {
      const attackerTierListId = 100;
      const victimBookId = 999;

      // Book placement NOT found during update
      (prisma.bookPlacement.update as any).mockImplementation(() => {
        throw new Error("Record not found");
      });

      // Service call should fail
      await expect(
        service.updateBook(attackerTierListId, victimBookId, { title: "Hacked" }),
      ).rejects.toThrow("Record not found");
    });

    it("should allow updating a book if it belongs to the tier list", async () => {
      const tierListId = 100;
      const bookId = 999;

      (prisma.bookPlacement.update as any).mockResolvedValue({
        book: { id: bookId, title: "Updated" },
      });

      const result = await service.updateBook(tierListId, bookId, {
        title: "Updated",
      });

      expect(result.title).toBe("Updated");
      expect(prisma.bookPlacement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tierListId_bookId: { tierListId, bookId } },
        }),
      );
    });
  });

  describe("updateBookCover BOLA", () => {
    it("should NOT allow updating a book cover if it doesn't belong to the tier list (FIXED)", async () => {
      const attackerTierListId = 100;
      const victimBookId = 999;

      // Book placement NOT found
      (prisma.bookPlacement.update as any).mockImplementation(() => {
        throw new Error("Record not found");
      });

      await expect(
        service.updateBookCover(
          attackerTierListId,
          victimBookId,
          "new-cover.jpg",
        ),
      ).rejects.toThrow("Record not found");
    });
  });
});
