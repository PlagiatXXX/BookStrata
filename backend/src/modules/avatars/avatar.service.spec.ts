import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../lib/cloudinary.js", () => ({
  uploadFromUrl: vi.fn(),
}));

import * as avatarService from "./avatar.service.js";
import { uploadFromUrl } from "../../lib/cloudinary.js";
import { prisma } from "../../lib/prisma.js";

process.env.POLLINATIONS_API_KEY = "test-pollinations-key";
process.env.POLLINATIONS_MODEL = "zimage";

describe("avatar.service", () => {
  const mockUserId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadFromUrl).mockResolvedValue({
      url: "https://res.cloudinary.com/test/image.webp",
      publicId: "test_id",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("generateAvatar", () => {
    it("blocks generation when daily limit is reached", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 10,
        lastAvatarResetAt: new Date(),
      } as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("лимит");
    });

    it("returns user not found when profile is missing", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });

    it("allows generation within the limit", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("resets the counter for a new day", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 10,
        lastAvatarResetAt: yesterday,
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAvatarsGenerated: 1,
            lastAvatarResetAt: expect.any(Date),
          }),
        }),
      );
    });

    it("proxies the Pollinations URL through Cloudinary to hide the API key", async () => {
      const prompt = "cyberpunk portrait with neon glasses";
      const mockCloudinaryUrl = "https://res.cloudinary.com/demo/image/upload/v1/generated.webp";

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      vi.mocked(uploadFromUrl).mockResolvedValue({ url: mockCloudinaryUrl, publicId: "test" });

      const result = await avatarService.generateAvatar(prompt, mockUserId);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe(mockCloudinaryUrl);

      // Verify that uploadFromUrl was called with the correct Pollinations URL (including key)
      expect(uploadFromUrl).toHaveBeenCalledWith(
        expect.stringContaining("https://gen.pollinations.ai/image/"),
        "tiermaker-pro/generated-avatars"
      );
      const callUrl = vi.mocked(uploadFromUrl).mock.calls[0][0];
      expect(callUrl).toContain(`key=test-pollinations-key`);
    });

    it("does not increment the counter if Cloudinary upload fails", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(uploadFromUrl).mockRejectedValue(new Error("Cloudinary error"));

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAvatarsGenerated: { increment: 1 },
          }),
        }),
      );
    });

    it("increments the generated avatar counter", async () => {
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
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await avatarService.generateAvatar("test prompt", mockUserId);
      await avatarService.generateAvatar("test prompt", mockUserId);

      expect(uploadFromUrl).toHaveBeenCalledTimes(2);

      const firstUrl = vi.mocked(uploadFromUrl).mock.calls[0][0];
      const secondUrl = vi.mocked(uploadFromUrl).mock.calls[1][0];

      const seedOne = firstUrl.match(/seed=(\d+)/)?.[1];
      const seedTwo = secondUrl.match(/seed=(\d+)/)?.[1];

      expect(seedOne).toBeDefined();
      expect(seedTwo).toBeDefined();
      expect(seedOne).not.toBe(seedTwo);
    });

    it("returns the updated remaining counter", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 3,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.remaining).toBe(6);
    });

    it("returns an explicit error instead of a fallback avatar when generation fails", async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("API error"));

      const result = await avatarService.generateAvatar("test prompt", mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to generate avatar");
      expect(result.imageUrl).toBeUndefined();
    });

    it("allows generation when user has not reached the limit", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: new Date(),
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await avatarService.generateAvatar(
        "test prompt",
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe("getAvatarLimit", () => {
    it("returns user limits", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 5,
        lastAvatarResetAt: new Date(),
      } as never);

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 5,
        limit: 10,
        remaining: 5,
      });
    });

    it("returns refreshed limits for a new day", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        aiAvatarsGenerated: 10,
        lastAvatarResetAt: yesterday,
      } as never);

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toEqual({
        used: 0,
        limit: 10,
        remaining: 10,
      });
    });

    it("returns null when the user is missing", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      const result = await avatarService.getAvatarLimit(mockUserId);

      expect(result).toBeNull();
    });
  });
});
