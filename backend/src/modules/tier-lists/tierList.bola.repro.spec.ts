import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../lib/prisma.js";
import * as service from "./tierList.service.js";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((promises) => Promise.all(promises)),
    tierList: {
      findUnique: vi.fn().mockResolvedValue({ id: "1" }),
    },
    bookPlacement: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
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

  it("VULNERABILITY: updatePlacements should NOT use createMany as it allows linking arbitrary books (BOLA)", async () => {
    const myTierListId = "1";
    const someoneElsesBookId = 999;

    const placements = [
      { bookId: someoneElsesBookId, tierId: null, rank: 0 }
    ];

    // Current implementation uses deleteMany+createMany which will succeed and create a link if we don't check first
    await service.updatePlacements(myTierListId, placements);

    // If it used createMany, it's vulnerable to creating a new record for a book we don't own
    expect(prisma.bookPlacement.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ bookId: someoneElsesBookId })
      ])
    }));
  });
});
