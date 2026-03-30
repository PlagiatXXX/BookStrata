import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";

// Логгер для сервиса аватаров
const logger = createLogger("Avatars", { color: "yellow" });

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "zimage";
const POLLINATIONS_API_URL = "https://gen.pollinations.ai";
const DAILY_AVATAR_LIMIT_FREE = 0; // Free пользователи не могут генерировать
const DAILY_AVATAR_LIMIT_PRO = 50; // Pro пользователи: 50 в день

const subscriptionsService = new SubscriptionsService();

// Проверка и обновление лимита пользователя
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

  // Администраторы, модераторы и Pro пользователи имеют лимит 50, Free - 0
  const hasAdminRole = userRole === "admin" || userRole === "moderator";
  const dailyLimit =
    hasAdminRole || isPro ? DAILY_AVATAR_LIMIT_PRO : DAILY_AVATAR_LIMIT_FREE;

  // Проверяем, нужно ли сбросить счётчик (новый день)
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

// Pollinations.ai AI генерация
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
    // Проверяем лимит
    const limitCheck = await checkAvatarLimit(userId, userRole);

    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error || "Limit reached" };
    }

    const fullPrompt = `${prompt}, portrait, face, square format, avatar, high quality`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 1000000);

    // Новый API gen.pollinations.ai использует формат: /image/{prompt}
    // API ключ ОБЯЗАТЕЛЕН для нового API
    let imageUrl = `${POLLINATIONS_API_URL}/image/${encodedPrompt}?model=${POLLINATIONS_MODEL || "flux"}&width=512&height=512&seed=${seed}&nologo=true`;

    if (POLLINATIONS_API_KEY) {
      imageUrl += `&key=${POLLINATIONS_API_KEY}`;
    } else {
      logger.warn("POLLINATIONS_API_KEY not set - generation will fail");
    }

    // Увеличиваем счётчик
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
    const fallbackUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(prompt)}&backgroundColor=b6e3f4`;
    return { success: true, imageUrl: fallbackUrl };
  }
}

// Получить информацию о лимите пользователя
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
