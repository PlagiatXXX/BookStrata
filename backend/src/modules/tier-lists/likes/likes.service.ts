import { prisma } from '../../../lib/prisma.js';

// Получить лайки тир-листа
export async function getLikes(tierListId: string) {
  const likes = await prisma.tierListLike.count({
    where: { tierListId },
  });
  return likes;
}

// Проверить, лайкнул ли пользователь
export async function isLikedByUser(tierListId: string, userId: number) {
  const like = await prisma.tierListLike.findUnique({
    where: {
      userId_tierListId: { userId, tierListId },
    },
  });
  return !!like;
}

// Поставить лайк
export async function like(tierListId: string, userId: number) {
  const existing = await prisma.tierListLike.findUnique({
    where: {
      userId_tierListId: { userId, tierListId },
    },
  });

  if (existing) {
    return { success: false, message: 'Already liked' };
  }

  // Используем транзакцию для атомарного обновления
  await prisma.$transaction([
    prisma.tierListLike.create({
      data: {
        userId,
        tierListId,
      },
    }),
    prisma.tierList.update({
      where: { id: tierListId },
      data: { likesCount: { increment: 1 } },
    }),
  ]);

  return { success: true };
}

// Убрать лайк
export async function unlike(tierListId: string, userId: number) {
  // Оптимизация Bolt: используем findUnique для поиска по составному индексу
  const existing = await prisma.tierListLike.findUnique({
    where: {
      userId_tierListId: { userId, tierListId },
    },
  });

  if (!existing) {
    return { success: false, message: 'Not liked' };
  }

  // Используем транзакцию для атомарного обновления
  await prisma.$transaction([
    prisma.tierListLike.delete({
      where: { userId_tierListId: { userId, tierListId } },
    }),
    prisma.tierList.update({
      where: { id: tierListId },
      data: { likesCount: { decrement: 1 } },
    }),
  ]);

  return { success: true };
}

// Получить лайки и статус лайка для пользователя
export async function getLikesWithStatus(tierListId: string, userId?: number) {
  // Оптимизация Bolt: получаем количество лайков и статус в одном запросе
  const tierList = await prisma.tierList.findUnique({
    where: { id: tierListId },
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
