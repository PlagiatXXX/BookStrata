import { prisma } from '../../../lib/prisma.js';

// Получить лайки шаблона
export async function getLikes(templateId: string) {
  const likes = await prisma.templateLike.count({
    where: { templateId },
  });
  return likes;
}

// Проверить, лайкнул ли пользователь
export async function isLikedByUser(templateId: string, userId: number) {
  const like = await prisma.templateLike.findUnique({
    where: {
      userId_templateId: {
        userId,
        templateId,
      },
    },
  });
  return !!like;
}

// Поставить лайк
export async function like(templateId: string, userId: number) {
  const existing = await prisma.templateLike.findUnique({
    where: {
      userId_templateId: {
        userId,
        templateId,
      },
    },
  });

  if (existing) {
    return { success: false, message: 'Already liked' };
  }

  await prisma.templateLike.create({
    data: {
      userId,
      templateId,
    },
  });

  return { success: true };
}

// Убрать лайк
export async function unlike(templateId: string, userId: number) {
  await prisma.templateLike.delete({
    where: {
      userId_templateId: {
        userId,
        templateId,
      },
    },
  });

  return { success: true };
}

// Получить лайки и статус лайка для пользователя
export async function getLikesWithStatus(templateId: string, userId?: number) {
  const likesCount = await prisma.templateLike.count({
    where: { templateId },
  });

  let isLiked = false;
  if (userId) {
    const like = await prisma.templateLike.findUnique({
      where: {
        userId_templateId: {
          userId,
          templateId,
        },
      },
    });
    isLiked = !!like;
  }

  return {
    likesCount,
    isLiked,
  };
}
