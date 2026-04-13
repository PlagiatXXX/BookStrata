import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";

const logger = createLogger("Achievements", { color: "yellow" });

export type AchievementId =
  | 'first_tier_list'
  | 'bibliophile_10'
  | 'bibliophile_50'
  | 'popular_author_10'
  | 'explorer'
  | 'critic'
  | 'battle_participant'
  | 'battle_winner';

/**
 * Получить все достижения пользователя (включая невыполненные)
 */
export async function getUserAchievements(userId: number) {
  // Оптимизация Bolt: получаем все достижения и статус их получения пользователем в одном запросе
  // Это сокращает количество roundtrip-ов к БД с 2 до 1.
  const allAchievements = await prisma.achievement.findMany({
    include: {
      users: {
        where: { userId },
        select: { earnedAt: true },
      },
    },
    orderBy: { xpValue: "asc" },
  });

  return allAchievements.map((achievement) => {
    const userEarned = achievement.users[0];
    const isEarned = !!userEarned;
    const earnedAt = userEarned?.earnedAt || null;

    const { users, ...rest } = achievement;

    return {
      ...rest,
      title:
        achievement.isSecret && !isEarned
          ? "Секретное достижение"
          : achievement.title,
      description:
        achievement.isSecret && !isEarned ? "???" : achievement.description,
      isEarned,
      earnedAt,
    };
  });
}

/**
 * Проверить и выдать достижение
 */
export async function checkAndGrantAchievement(userId: number, achievementId: AchievementId) {
  try {
    // Проверяем, есть ли уже такое достижение
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId }
      }
    });

    if (existing) return null;

    // Получаем данные достижения
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId }
    });

    if (!achievement) return null;

    // Выдаем достижение в транзакции: запись + XP пользователю
    const result = await prisma.$transaction(async (tx) => {
      const userAchievement = await tx.userAchievement.create({
        data: { userId, achievementId },
        include: { achievement: true }
      });

      await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: achievement.xpValue } }
      });

      return userAchievement;
    });

    logger.info("Достижение получено!", { userId, achievementId });
    return result.achievement;
  } catch (error) {
    logger.error(error as Error, { function: "checkAndGrantAchievement", userId, achievementId });
    return null;
  }
}

/**
 * Логика проверки условий для разных действий
 */
export async function processAction(userId: number, action: 'create_tier_list' | 'add_book' | 'get_like' | 'fork' | 'write_review' | 'participate_battle' | 'win_battle') {
  const newAchievements = [];

  switch (action) {
    case 'create_tier_list': {
      const count = await prisma.tierList.count({ where: { userId } });
      if (count === 1) {
        const a = await checkAndGrantAchievement(userId, 'first_tier_list');
        if (a) newAchievements.push(a);
      }
      break;
    }
    case 'add_book': {
      const count = await prisma.bookPlacement.count({ where: { tierList: { userId } } });
      if (count >= 10) {
        const a = await checkAndGrantAchievement(userId, 'bibliophile_10');
        if (a) newAchievements.push(a);
      }
      if (count >= 50) {
        const a = await checkAndGrantAchievement(userId, 'bibliophile_50');
        if (a) newAchievements.push(a);
      }
      break;
    }
    case 'fork': {
       const a = await checkAndGrantAchievement(userId, 'explorer');
       if (a) newAchievements.push(a);
       break;
    }
    case 'write_review': {
       const a = await checkAndGrantAchievement(userId, 'critic');
       if (a) newAchievements.push(a);
       break;
    }
    case 'get_like': {
       const likesCount = await prisma.tierListLike.count({ where: { tierList: { userId } } });
       if (likesCount >= 10) {
         const a = await checkAndGrantAchievement(userId, 'popular_author_10');
         if (a) newAchievements.push(a);
       }
       break;
    }
    case 'participate_battle': {
       const a = await checkAndGrantAchievement(userId, 'battle_participant');
       if (a) newAchievements.push(a);
       break;
    }
    case 'win_battle': {
       const a = await checkAndGrantAchievement(userId, 'battle_winner');
       if (a) newAchievements.push(a);
       break;
    }
  }
  return newAchievements;
}

/**
 * Получить текущее звание пользователя на основе XP
 */
export function getTitleByXP(xp: number) {
  if (xp >= 1000) return "Легенда библиотек";
  if (xp >= 500) return "Мудрец";
  if (xp >= 200) return "Думающий";
  if (xp >= 100) return "Книжный червь";
  if (xp >= 50) return "Читающий";
  if (xp >= 20) return "Мастер";
  return "Новичок";
}
