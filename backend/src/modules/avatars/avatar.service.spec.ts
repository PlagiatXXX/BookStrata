import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import * as avatarService from "./avatar.service.js";
import { prisma } from "../../lib/prisma.js";

process.env.POLLINATIONS_API_KEY = "test-pollinations-key";
process.env.POLLINATIONS_MODEL = "zimage";

describe("avatar.service", () => {
  const mockUserId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("generateAvatar", () => {
    it("rejects generation for free users when daily limit is zero", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      } as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Daily limit reached (0 per day)");
    });

    it("returns user not found when profile is missing", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });

    it("allows generation for pro users within the limit", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(44);
    });

    it("resets the counter for a new day", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 50,
        lastAvatarResetAt: yesterday,
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(49);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAvatarsGenerated: 0,
            lastAvatarResetAt: expect.any(Date),
          }),
        }),
      );
    });

    it("builds the Pollinations URL from the raw user prompt", async () => {
      const prompt = "cyberpunk portrait with neon glasses";

      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await avatarService.generateAvatar(prompt, mockUserId);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain("https://gen.pollinations.ai/image/");
      expect(result.imageUrl).toContain("model=zimage");
      expect(result.imageUrl).toContain("width=512");
      expect(result.imageUrl).toContain("height=512");
      expect(result.imageUrl).toContain("seed=");
      expect(result.imageUrl).toContain("nologo=true");

      const [baseUrl] = (result.imageUrl ?? "").split("?");
      expect(baseUrl).toBe(
        `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`,
      );
      expect(decodeURIComponent(baseUrl)).not.toContain(", avatar");
      expect(decodeURIComponent(baseUrl)).not.toContain(", single subject");
    });

    it("adds the API key when configured", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.imageUrl).toContain("key=test-pollinations-key");
    });

    it("increments the generated avatar counter", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await avatarService.generateAvatar("test prompt", mockUserId);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAvatarsGenerated: { increment: 1 },
          }),
        }),
      );
    });

    it("uses a different seed between requests", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const first = await avatarService.generateAvatar("test prompt", mockUserId);
      const second = await avatarService.generateAvatar("test prompt", mockUserId);

      const seedOne = first.imageUrl?.match(/seed=(\d+)/)?.[1];
      const seedTwo = second.imageUrl?.match(/seed=(\d+)/)?.[1];

      expect(seedOne).toBeDefined();
      expect(seedTwo).toBeDefined();
      expect(seedOne).not.toBe(seedTwo);
    });

    it("returns the updated remaining counter", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 3,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.remaining).toBe(46);
    });

    it("returns an explicit error instead of a fallback avatar when generation fails", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );

      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("API error"));

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to generate avatar");
      expect(result.imageUrl).toBeUndefined();
    });

    it("allows generation for admin and moderator roles", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const adminResult = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
        "admin",
      );
      const moderatorResult = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
        "moderator",
      );

      expect(adminResult.success).toBe(true);
      expect(adminResult.remaining).toBe(49);
      expect(moderatorResult.success).toBe(true);
      expect(moderatorResult.remaining).toBe(49);
    });
  });

  describe("getAvatarLimit", () => {
    it("returns free limits", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 5,
        limit: 0,
        remaining: 0,
        isPro: false,
      });
    });

    it("returns refreshed limits for a new day", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        true,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 50,
        lastAvatarResetAt: yesterday,
      } as never);

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 0,
        limit: 50,
        remaining: 50,
        isPro: true,
      });
    });

    it("returns null when the user is missing", async () => {
      const { SubscriptionsService } =
        await import("../subscriptions/subscriptions.service.js");
      vi.spyOn(SubscriptionsService.prototype, "isProUser").mockResolvedValue(
        false,
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toBeNull();
    });
  });
});
