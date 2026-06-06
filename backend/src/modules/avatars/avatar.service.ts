import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";
import { uploadFromUrl } from "../../lib/cloudinary.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";

const logger = createLogger("Avatars", { color: "yellow" });

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "zimage";
const POLLINATIONS_API_URL = "https://gen.pollinations.ai";
const DAILY_LIMIT = 10;

async function uploadWithRetry(
  url: string,
  folder: string,
  retries = 2,
  delayMs = 1500,
): ReturnType<typeof uploadFromUrl> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await uploadFromUrl(url, folder);
    } catch (error) {
      if (attempt < retries) {
        logger.warn(`uploadFromUrl attempt ${attempt + 1} failed, retrying in ${delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error("uploadWithRetry: all attempts failed");
}

export async function generateAvatar(
  prompt: string,
  userId: number,
): Promise<{
  success: boolean;
  imageUrl?: string;
  error?: string;
  remaining?: number;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiAvatarsGenerated: true, lastAvatarResetAt: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const now = new Date();
    const lastReset = new Date(user.lastAvatarResetAt);
    const isNewDay =
      lastReset.getDate() !== now.getDate() ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    const used = isNewDay ? 0 : user.aiAvatarsGenerated;

    if (used >= DAILY_LIMIT) {
      return {
        success: false,
        error: `Ежедневный лимит исчерпан (${DAILY_LIMIT} в день)`,
        remaining: 0,
      };
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);

    const baseImageUrl = `${POLLINATIONS_API_URL}/image/${encodedPrompt}?model=${POLLINATIONS_MODEL || "flux"}&width=512&height=512&seed=${seed}&nologo=true`;
    const imageUrl = POLLINATIONS_API_KEY
      ? `${baseImageUrl}&key=${POLLINATIONS_API_KEY}`
      : baseImageUrl;

    if (!POLLINATIONS_API_KEY) {
      logger.warn("POLLINATIONS_API_KEY not set - generation may be rate-limited");
    }

    const uploadResult = await uploadWithRetry(imageUrl, "tiermaker-pro/generated-avatars");

    await prisma.user.update({
      where: { id: userId },
      data: {
        aiAvatarsGenerated: isNewDay ? 1 : { increment: 1 },
        lastAvatarResetAt: now,
      },
    });

    return {
      success: true,
      imageUrl: uploadResult.url,
      remaining: DAILY_LIMIT - used - 1,
    };
  } catch (error) {
    logger.error(error as Error, { function: "generateAvatar", prompt });
    return {
      success: false,
      error: "Failed to generate avatar",
    };
  }
}

export async function getAvatarLimit(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiAvatarsGenerated: true, lastAvatarResetAt: true },
  });

  if (!user) return null;

  const now = new Date();
  const lastReset = new Date(user.lastAvatarResetAt);
  const isNewDay =
    lastReset.getDate() !== now.getDate() ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();

  const used = isNewDay ? 0 : user.aiAvatarsGenerated;

  return { used, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - used };
}
