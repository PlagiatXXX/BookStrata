import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tierList: {
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
    },
    book: {
      create: vi.fn(),
    },
    bookPlacement: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prismaMock)),
  },
}));

const prismaMock = {
  tierList: {
    create: vi.fn(),
  },
  book: {
    create: vi.fn(),
  },
  bookPlacement: {
    create: vi.fn(),
  },
};

import { prisma } from "../../lib/prisma.js";
import { forkTierList } from "./tierList.service.js";

describe("Tier List forkTierList BOLA Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-bind prismaMock to the transaction mock for each test
    (prisma.$transaction as any).mockImplementation((cb: any) => cb(prismaMock));
  });

  it("should NOT allow forking a private tier list that belongs to another user", async () => {
    const victimTierListId = 1;
    const attackerUserId = 999;
    const victimUserId = 42;

    // Mock the original tier list as PRIVATE and belonging to the victim
    (prisma.tierList.findUniqueOrThrow as any).mockResolvedValue({
      id: victimTierListId,
      userId: victimUserId,
      title: "Secret List",
      isPublic: false,
      tiers: [],
      placements: [],
    });

    // Mock the creation of the new tier list
    prismaMock.tierList.create.mockResolvedValue({
      id: 102,
      userId: attackerUserId,
      title: "Secret List (копия)",
      tiers: []
    });

    // In a vulnerable version, this succeeds (NO ERROR).
    // In a secured version, this should throw Forbidden (403).
    await expect(forkTierList(victimTierListId, attackerUserId)).rejects.toThrow("Forbidden");

    // Create should not have been called
    expect(prismaMock.tierList.create).not.toHaveBeenCalled();
  });

  it("should allow forking a public tier list that belongs to another user", async () => {
    const victimTierListId = 2;
    const attackerUserId = 999;
    const victimUserId = 42;

    // Mock the original tier list as PUBLIC
    (prisma.tierList.findUniqueOrThrow as any).mockResolvedValue({
      id: victimTierListId,
      userId: victimUserId,
      title: "Public List",
      isPublic: true,
      tiers: [],
      placements: [],
    });

    // Mock the creation of the new tier list
    prismaMock.tierList.create.mockResolvedValue({
        id: 100,
        userId: attackerUserId,
        title: "Public List (копия)",
        tiers: []
    });

    await forkTierList(victimTierListId, attackerUserId);

    expect(prismaMock.tierList.create).toHaveBeenCalled();
  });

  it("should allow forking your own private tier list", async () => {
    const userId = 42;
    const tierListId = 3;

    // Mock the original tier list as PRIVATE but belonging to the same user
    (prisma.tierList.findUniqueOrThrow as any).mockResolvedValue({
      id: tierListId,
      userId: userId,
      title: "My Private List",
      isPublic: false,
      tiers: [],
      placements: [],
    });

    prismaMock.tierList.create.mockResolvedValue({
        id: 101,
        userId: userId,
        title: "My Private List (копия)",
        tiers: []
    });

    await forkTierList(tierListId, userId);

    expect(prismaMock.tierList.create).toHaveBeenCalled();
  });
});
