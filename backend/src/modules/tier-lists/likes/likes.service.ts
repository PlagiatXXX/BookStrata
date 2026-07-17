import { prisma } from '../../../lib/prisma.js';
import { tierListRepository } from "../../../repositories/index.js";

// Получить количество лайков тир-листа
export async function getLikes(tierListId: string) {
  const realId = await tierListRepository.resolveId(tierListId).catch(() => null);
  if (!realId) return 0;

  return prisma.tierListLike.count({
    where: { tierListId: realId },
  });
}

// Проверить, лайкнул ли пользователь
export async function isLikedByUser(tierListId: string, userId: number) {
  const tierList = await tierListRepository.findById(tierListId, {
    select: { id: true },
  });
  if (!tierList) return false;

  const like = await prisma.tierListLike.findUnique({
    where: {
      userId_tierListId: { userId, tierListId: tierList.id },
    },
  });
  return !!like;
}

// Поставить лайк (идемпотентный — если уже лайкнул, просто возвращает success)
export async function like(tierListId: string, userId: number) {
  const realId = await tierListRepository.resolveId(tierListId);

  const existing = await prisma.tierListLike.findUnique({
    where: {
      userId_tierListId: { userId, tierListId: realId },
    },
  });

  if (existing) {
    return { success: true };
  }

  await prisma.$transaction([
    prisma.tierListLike.create({
      data: {
        userId,
        tierListId: realId,
      },
    }),
    prisma.tierList.update({
      where: { id: realId },
      data: { likesCount: { increment: 1 } },
    }),
  ]);

  return { success: true };
}

// Убрать лайк
export async function unlike(tierListId: string, userId: number) {
  const realId = await tierListRepository.resolveId(tierListId);

  const existing = await prisma.tierListLike.findUnique({
    where: {
      userId_tierListId: { userId, tierListId: realId },
    },
  });

  if (!existing) {
    return { success: false, message: 'Not liked' };
  }

  await prisma.$transaction([
    prisma.tierListLike.delete({
      where: { userId_tierListId: { userId, tierListId: realId } },
    }),
    prisma.tierList.update({
      where: { id: realId },
      data: { likesCount: { decrement: 1 } },
    }),
  ]);

  return { success: true };
}

// Получить лайки и статус лайка для пользователя
export async function getLikesWithStatus(tierListId: string, userId?: number) {
  // Оптимизация Bolt: получаем количество лайков и статус в одном запросе
  const tierList = await tierListRepository.findById(tierListId, {
    select: {
      likesCount: true,
      likes: userId
        ? {
            where: { userId },
            select: { id: true },
          }
        : false,
    },
  });

  if (!tierList) {
    return {
      likesCount: 0,
      isLiked: false,
    };
  }

  return {
    likesCount: tierList.likesCount,
    isLiked: !!(tierList as unknown as { likes: { id: number }[] }).likes?.length,
  };
}

// Получить все ID лайкнутых тир-листов пользователя
export async function getLikedTierListIds(userId: number) {
  const likes = await prisma.tierListLike.findMany({
    where: { userId },
    select: { tierListId: true },
  });
  return likes.map((like) => like.tierListId);
}
