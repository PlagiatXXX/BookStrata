import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";
import { uploadFromUrl } from "../../lib/cloudinary.js";

const logger = createLogger("Avatars", { color: "yellow" });

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "zimage";
const POLLINATIONS_API_URL = "https://gen.pollinations.ai";
const DAILY_AVATAR_LIMIT = 10;

async function checkAvatarLimit(
  userId: number,
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

    return { allowed: true, remaining: DAILY_AVATAR_LIMIT };
  }

  const remaining = Math.max(0, DAILY_AVATAR_LIMIT - user.aiAvatarsGenerated);

  if (user.aiAvatarsGenerated >= DAILY_AVATAR_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      error: `Daily limit reached (${DAILY_AVATAR_LIMIT} per day)`,
    };
  }

  return { allowed: true, remaining };
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
    const limitCheck = await checkAvatarLimit(userId);

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

export async function getAvatarLimit(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiAvatarsGenerated: true,
      lastAvatarResetAt: true,
    },
  });

  if (!user) return null;

  const now = new Date();
  const lastReset = new Date(user.lastAvatarResetAt);
  const isNewDay =
    lastReset.getDate() !== now.getDate() ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();

  if (isNewDay) {
    return {
      used: 0,
      limit: DAILY_AVATAR_LIMIT,
      remaining: DAILY_AVATAR_LIMIT,
    };
  }

  return {
    used: user.aiAvatarsGenerated,
    limit: DAILY_AVATAR_LIMIT,
    remaining: Math.max(0, DAILY_AVATAR_LIMIT - user.aiAvatarsGenerated),
  };
}
