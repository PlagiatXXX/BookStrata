import { prisma } from '../../../lib/prisma.js';

// Получить лайки тир-листа
export async function getLikes(tierListId: number) {
  const likes = await prisma.tierListLike.count({
    where: { tierListId },
  });
  return likes;
}

// Проверить, лайкнул ли пользователь
export async function isLikedByUser(tierListId: number, userId: number) {
  const like = await prisma.tierListLike.findFirst({
    where: {
      userId,
      tierListId,
    },
  });
  return !!like;
}

// Поставить лайк
export async function like(tierListId: number, userId: number) {
  const existing = await prisma.tierListLike.findFirst({
    where: {
      userId,
      tierListId,
    },
  });

  if (existing) {
    return { success: false, message: 'Already liked' };
  }

  await prisma.tierListLike.create({
    data: {
      userId,
      tierListId,
    },
  });

  return { success: true };
}

// Убрать лайк
export async function unlike(tierListId: number, userId: number) {
  await prisma.tierListLike.deleteMany({
    where: {
      userId,
      tierListId,
    },
  });

  return { success: true };
}

// Получить лайки и статус лайка для пользователя
export async function getLikesWithStatus(tierListId: number, userId?: number) {
  const likesCount = await prisma.tierListLike.count({
    where: { tierListId },
  });

  let isLiked = false;
  if (userId) {
    const like = await prisma.tierListLike.findFirst({
      where: {
        userId,
        tierListId,
      },
    });
    isLiked = !!like;
  }

  return {
    likesCount,
    isLiked,
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
