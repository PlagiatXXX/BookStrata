import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../lib/prisma.js";
import * as service from "./tierList.service.js";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((promises) => Promise.all(promises)),
    bookPlacement: {
      upsert: vi.fn(),
      count: vi.fn(),
    },
    tier: {
      count: vi.fn(),
    }
  },
}));

describe("Tier List BOLA Reproduction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("VULNERABILITY: updatePlacements should NOT use upsert as it allows linking arbitrary books (BOLA)", async () => {
    const myTierListId = 1;
    const someoneElsesBookId = 999;

    const placements = [
      { bookId: someoneElsesBookId, tierId: null, rank: 0 }
    ];

    // Current implementation uses upsert which will succeed and create a link if we don't check first
    await service.updatePlacements(myTierListId, placements);

    // If it used upsert, it's vulnerable to creating a new record for a book we don't own
    expect(prisma.bookPlacement.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tierListId_bookId: { tierListId: myTierListId, bookId: someoneElsesBookId } },
      create: expect.any(Object)
    }));
  });
});
