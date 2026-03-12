import { prisma } from '../../lib/prisma.js';
import { createLogger } from '../../lib/logger.js';

// Логгер для сервиса аватаров
const logger = createLogger('Avatars', { color: 'yellow' });

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || 'flux';
const POLLINATIONS_API_URL = 'https://gen.pollinations.ai';
const DAILY_AVATAR_LIMIT = 10;

// Проверка и обновление лимита пользователя
async function checkAvatarLimit(userId: number): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      aiAvatarsGenerated: true, 
      lastAvatarResetAt: true 
    },
  });

  if (!user) {
    return { allowed: false, remaining: 0, error: 'User not found' };
  }

  // Проверяем, нужно ли сбросить счётчик (новый день)
  const now = new Date();
  const lastReset = new Date(user.lastAvatarResetAt);
  const isNewDay = lastReset.getDate() !== now.getDate() || 
                   lastReset.getMonth() !== now.getMonth() || 
                   lastReset.getFullYear() !== now.getFullYear();

  if (isNewDay) {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        aiAvatarsGenerated: 0,
        lastAvatarResetAt: now 
      },
    });
    return { allowed: true, remaining: DAILY_AVATAR_LIMIT };
  }

  const remaining = Math.max(0, DAILY_AVATAR_LIMIT - user.aiAvatarsGenerated);

  if (user.aiAvatarsGenerated >= DAILY_AVATAR_LIMIT) {
    return { allowed: false, remaining: 0, error: `Daily limit reached (${DAILY_AVATAR_LIMIT} per day)` };
  }

  return { allowed: true, remaining };
}

// Pollinations.ai AI генерация
export async function generateAvatar(prompt: string, userId: number): Promise<{
  success: boolean;
  imageUrl?: string;
  error?: string;
  remaining?: number;
}> {
  try {
    // Проверяем лимит
    const limitCheck = await checkAvatarLimit(userId);

    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error || 'Limit reached' };
    }

    const fullPrompt = `${prompt}, portrait, face, square format, avatar, high quality`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 1000000);

    // Новый API gen.pollinations.ai использует формат: /image/{prompt}
    // API ключ ОБЯЗАТЕЛЕН для нового API
    let imageUrl = `${POLLINATIONS_API_URL}/image/${encodedPrompt}?model=${POLLINATIONS_MODEL || 'flux'}&width=512&height=512&seed=${seed}&nologo=true`;

    if (POLLINATIONS_API_KEY) {
      imageUrl += `&key=${POLLINATIONS_API_KEY}`;
    } else {
      logger.warn('POLLINATIONS_API_KEY not set - generation will fail');
    }

    // Увеличиваем счётчик
    await prisma.user.update({
      where: { id: userId },
      data: { aiAvatarsGenerated: { increment: 1 } },
    });

    return {
      success: true,
      imageUrl,
      remaining: limitCheck.remaining - 1
    };
  } catch (error) {
    logger.error(error as Error, { function: 'generateAvatar', prompt });
    const fallbackUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(prompt)}&backgroundColor=b6e3f4`;
    return { success: true, imageUrl: fallbackUrl };
  }
}

// Получить информацию о лимите пользователя
export async function getAvatarLimit(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      aiAvatarsGenerated: true, 
      lastAvatarResetAt: true 
    },
  });

  if (!user) return null;

  const now = new Date();
  const lastReset = new Date(user.lastAvatarResetAt);
  const isNewDay = lastReset.getDate() !== now.getDate() || 
                   lastReset.getMonth() !== now.getMonth() || 
                   lastReset.getFullYear() !== now.getFullYear();

  if (isNewDay) {
    return { used: 0, limit: DAILY_AVATAR_LIMIT, remaining: DAILY_AVATAR_LIMIT };
  }

  return {
    used: user.aiAvatarsGenerated,
    limit: DAILY_AVATAR_LIMIT,
    remaining: Math.max(0, DAILY_AVATAR_LIMIT - user.aiAvatarsGenerated),
  };
}
