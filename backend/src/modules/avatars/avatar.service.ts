import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";
import { uploadFromUrl } from "../../lib/upload.js";

const logger = createLogger("Avatars", { color: "yellow" });
import { config } from "../../config/env.js";

const POLLINATIONS_API_URL = "https://gen.pollinations.ai";
const DAILY_LIMIT = 10;

function isNonRetryableError(error: unknown): boolean {
  const msg = (error as Error)?.message || "";
  return /\b(400|401|402|403)\b/.test(msg);
}

async function uploadWithRetry(
  url: string,
  folder: string,
  retries = 1,
  delayMs = 250,
): ReturnType<typeof uploadFromUrl> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await uploadFromUrl(url, folder);
    } catch (error) {
      if (attempt < retries && !isNonRetryableError(error)) {
        logger.warn(`uploadFromUrl attempt ${attempt + 1} failed, retrying in ${delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error("uploadWithRetry: all attempts failed");
}

function buildPollinationsUrl(
  prompt: string,
  model: string,
  apiKey?: string,
  seed?: number,
): string {
  const encoded = encodeURIComponent(prompt);
  const s = seed ?? Math.floor(Math.random() * 1000000);
  const base = `${POLLINATIONS_API_URL}/image/${encoded}?model=${model}&width=512&height=512&seed=${s}&nologo=true`;
  return apiKey ? `${base}&key=${apiKey}` : base;
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

    const seed = Math.floor(Math.random() * 1000000);
    const apiKey = config.POLLINATIONS_API_KEY;
    const preferredModel = config.POLLINATIONS_MODEL || "zimage";
    // Без ключа zimage/klein возвращают 401, поэтому сразу используем бесплатную flux
    const primaryModel = apiKey ? preferredModel : "flux";
    const primaryUrl = buildPollinationsUrl(prompt, primaryModel, apiKey, seed);

    let uploadResult;
    try {
      uploadResult = await uploadWithRetry(primaryUrl, "tiermaker-pro/generated-avatars");
    } catch (primaryError) {
      // Если запрос к основной платной модели упал (например, закончились квоты/401/500),
      // делаем автоматический фолбэк на бесплатную модель flux
      if (primaryModel !== "flux") {
        logger.warn(
          `Модель ${primaryModel} не сработала, пробуем фолбэк на flux: ${(primaryError as Error)?.message}`,
        );
        const fallbackUrl = buildPollinationsUrl(prompt, "flux", undefined, seed);
        uploadResult = await uploadWithRetry(fallbackUrl, "tiermaker-pro/generated-avatars");
      } else {
        throw primaryError;
      }
    }

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
