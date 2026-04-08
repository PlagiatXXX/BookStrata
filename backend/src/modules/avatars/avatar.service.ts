import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";

const logger = createLogger("Avatars", { color: "yellow" });

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "zimage";
const POLLINATIONS_API_URL = "https://gen.pollinations.ai";
const DAILY_AVATAR_LIMIT_FREE = 0;
const DAILY_AVATAR_LIMIT_PRO = 50;

const subscriptionsService = new SubscriptionsService();

async function checkAvatarLimit(
  userId: number,
  userRole?: string,
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  const [user, isPro] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiAvatarsGenerated: true,
        lastAvatarResetAt: true,
      },
    }),
    subscriptionsService.isProUser(userId),
  ]);

  if (!user) {
    return { allowed: false, remaining: 0, error: "User not found" };
  }

  const hasAdminRole = userRole === "admin" || userRole === "moderator";
  const dailyLimit =
    hasAdminRole || isPro ? DAILY_AVATAR_LIMIT_PRO : DAILY_AVATAR_LIMIT_FREE;

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

    return { allowed: dailyLimit > 0, remaining: dailyLimit };
  }

  const remaining = Math.max(0, dailyLimit - user.aiAvatarsGenerated);

  if (user.aiAvatarsGenerated >= dailyLimit) {
    return {
      allowed: false,
      remaining: 0,
      error: `Daily limit reached (${dailyLimit} per day)`,
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

    await prisma.user.update({
      where: { id: userId },
      data: { aiAvatarsGenerated: { increment: 1 } },
    });

    return {
      success: true,
      imageUrl,
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
  const [user, isPro] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiAvatarsGenerated: true,
        lastAvatarResetAt: true,
      },
    }),
    subscriptionsService.isProUser(userId),
  ]);

  if (!user) return null;

  const hasAdminRole = userRole === "admin" || userRole === "moderator";
  const dailyLimit =
    hasAdminRole || isPro ? DAILY_AVATAR_LIMIT_PRO : DAILY_AVATAR_LIMIT_FREE;

  const now = new Date();
  const lastReset = new Date(user.lastAvatarResetAt);
  const isNewDay =
    lastReset.getDate() !== now.getDate() ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();

  if (isNewDay) {
    return {
      used: 0,
      limit: dailyLimit,
      remaining: dailyLimit,
      isPro,
    };
  }

  return {
    used: user.aiAvatarsGenerated,
    limit: dailyLimit,
    remaining: Math.max(0, dailyLimit - user.aiAvatarsGenerated),
    isPro,
  };
}
