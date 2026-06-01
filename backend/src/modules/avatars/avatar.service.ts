import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";
import { uploadFromUrl } from "../../lib/cloudinary.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";

const logger = createLogger("Avatars", { color: "yellow" });

const subscriptionsService = new SubscriptionsService();

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "zimage";
const POLLINATIONS_API_URL = "https://gen.pollinations.ai";
const DAILY_AVATAR_LIMIT_FREE = 0;
const DAILY_AVATAR_LIMIT_PRO = 50;

async function checkAvatarLimit(
  userId: number,
  userRole?: string,
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiAvatarsGenerated: true,
      lastAvatarResetAt: true,
    },
  });

  if (!user) {
    return { allowed: false, remaining: 0, error: "User not found" };
  }

  const isAdmin = userRole === "admin" || userRole === "moderator";
  if (isAdmin) {
    return { allowed: true, remaining: DAILY_AVATAR_LIMIT_PRO };
  }

  const isPro = await subscriptionsService.isProUser(userId);
  const limit = isPro ? DAILY_AVATAR_LIMIT_PRO : DAILY_AVATAR_LIMIT_FREE;

  const now = new Date();
  const lastReset = new Date(user.lastAvatarResetAt);
  const isNewDay =
    lastReset.getDate() !== now.getDate() ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();

  if (isNewDay) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: now,
      },
    });

    return { allowed: true, remaining: limit };
  }

  const remaining = Math.max(0, limit - user.aiAvatarsGenerated);

  if (user.aiAvatarsGenerated >= limit) {
    return {
      allowed: false,
      remaining: 0,
      error: `Ежедневный лимит исчерпан (${limit} в день)`,
    };
  }

  return { allowed: true, remaining };
}

export async function generateAvatar(
  prompt: string,
  userId: number,
  userRole?: string,
): Promise<{
  success: boolean;
  imageUrl?: string;
  error?: string;
  remaining?: number;
}> {
  try {
    const limitCheck = await checkAvatarLimit(userId, userRole);

    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error || "Limit reached" };
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);

    let imageUrl = `${POLLINATIONS_API_URL}/image/${encodedPrompt}?model=${POLLINATIONS_MODEL || "flux"}&width=512&height=512&seed=${seed}&nologo=true`;

    if (POLLINATIONS_API_KEY) {
      imageUrl += `&key=${POLLINATIONS_API_KEY}`;
    } else {
      logger.warn("POLLINATIONS_API_KEY not set - generation will fail");
    }

    // Security: Upload the generated image to Cloudinary to hide the external API key
    // This ensures the client never sees the POLLINATIONS_API_KEY in the response
    const uploadResult = await uploadFromUrl(imageUrl, "tiermaker-pro/generated-avatars");

    await prisma.user.update({
      where: { id: userId },
      data: { aiAvatarsGenerated: { increment: 1 } },
    });

    return {
      success: true,
      imageUrl: uploadResult.url,
      remaining: limitCheck.remaining - 1,
    };
  } catch (error) {
    logger.error(error as Error, { function: "generateAvatar", prompt });
    return {
      success: false,
      error: "Failed to generate avatar",
    };
  }
}

export async function getAvatarLimit(userId: number, userRole?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiAvatarsGenerated: true,
      lastAvatarResetAt: true,
    },
  });

  if (!user) return null;

  const isAdmin = userRole === "admin" || userRole === "moderator";
  if (isAdmin) {
    return { used: 0, limit: DAILY_AVATAR_LIMIT_PRO, remaining: DAILY_AVATAR_LIMIT_PRO };
  }

  const isPro = await subscriptionsService.isProUser(userId);
  const limit = isPro ? DAILY_AVATAR_LIMIT_PRO : DAILY_AVATAR_LIMIT_FREE;

  const now = new Date();
  const lastReset = new Date(user.lastAvatarResetAt);
  const isNewDay =
    lastReset.getDate() !== now.getDate() ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();

  if (isNewDay) {
    return { used: 0, limit, remaining: limit };
  }

  return {
    used: user.aiAvatarsGenerated,
    limit,
    remaining: Math.max(0, limit - user.aiAvatarsGenerated),
  };
}
