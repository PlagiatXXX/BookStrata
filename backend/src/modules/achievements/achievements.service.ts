import { prisma } from "../../lib/prisma.js";
import { createLogger } from "../../lib/logger.js";

const logger = createLogger("Achievements", { color: "yellow" });

export type AchievementId =
  | 'bookworm_1' | 'bookworm_2' | 'bookworm_3' | 'bookworm_4' | 'bookworm_5'
  | 'popular_1' | 'popular_2' | 'popular_3' | 'popular_4'
  | 'critic_1' | 'critic_2' | 'critic_3' | 'critic_4'
  | 'curator_1' | 'curator_2' | 'curator_3'
  | 'fighter_1' | 'fighter_2' | 'fighter_3' | 'fighter_4'
  | 'secret_lucky' | 'secret_night' | 'secret_speed'
  | 'explorer'
  | 'first_tier_list' | 'bibliophile_10' | 'bibliophile_50' | 'popular_author_10' | 'battle_participant' | 'battle_winner' | 'critic';

export const USER_TITLES = [
  { minXP: 0, title: 'Любопытный наблюдатель', icon: '👀' },
  { minXP: 50, title: 'Начинающий книголюб', icon: '📘' },
  { minXP: 150, title: 'Страничный глотатель', icon: '📄' },
  { minXP: 300, title: 'Абзацевый ас', icon: '🅰️' },
  { minXP: 500, title: 'Главастый мастер', icon: '📑' },
  { minXP: 800, title: 'Томный тусовщик', icon: '📚' },
  { minXP: 1200, title: 'Шкафный стратег', icon: '🗄️' },
  { minXP: 1700, title: 'Библиотечный волк', icon: '🐺' },
  { minXP: 2300, title: 'Свитковый мудрец', icon: '📜' },
  { minXP: 3000, title: 'Фолиантный феодал', icon: '🏰' },
  { minXP: 3800, title: 'Инкунабульный игрок', icon: '🎭' },
  { minXP: 4700, title: 'Палимпсестовый принц', icon: '🤴' },
  { minXP: 5700, title: 'Кодесный король', icon: '👑' },
  { minXP: 6800, title: 'Манускриптный маг', icon: '🧙‍♂️' },
  { minXP: 8000, title: 'Летописный лорд', icon: '🏛️' },
  { minXP: 9500, title: 'Хроникер вселенной', icon: '🌍' },
  { minXP: 11000, title: 'Архивариус времени', icon: '⏳' },
  { minXP: 13000, title: 'Вселенский читатель', icon: '🌌' }
];

/**
 * Получить все достижения пользователя
 */
export async function getUserAchievements(userId: number) {
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

    const { users: _users, ...rest } = achievement;
    void _users;

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
 * Проверить и выдать достижение, а также обновить звание
 */
export async function checkAndGrantAchievement(userId: number, achievementId: AchievementId) {
  try {
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId }
      }
    });

    if (existing) return null;

    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId }
    });

    if (!achievement) return null;

    const result = await prisma.$transaction(async (tx) => {
      const userAchievement = await tx.userAchievement.create({
        data: { userId, achievementId },
        include: { achievement: true }
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: achievement.xpValue } }
      });

      // Обновляем звание
      const newTitle = getTitleByXP(updatedUser.xp);
      if (newTitle !== updatedUser.title) {
        await tx.user.update({
          where: { id: userId },
          data: { title: newTitle }
        });
      }

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
      if (count >= 1) {
        const a = await checkAndGrantAchievement(userId, 'curator_1');
        if (a) newAchievements.push(a);
        const aL = await checkAndGrantAchievement(userId, 'first_tier_list');
        if (aL) newAchievements.push(aL);
      }
      if (count >= 5) {
        const a = await checkAndGrantAchievement(userId, 'curator_2');
        if (a) newAchievements.push(a);
      }
      if (count >= 20) {
        const a = await checkAndGrantAchievement(userId, 'curator_3');
        if (a) newAchievements.push(a);
      }
      break;
    }
    case 'add_book': {
      const count = await prisma.bookPlacement.count({ where: { tierList: { userId } } });
      const bookwormThresholds: [number, AchievementId][] = [
        [1, 'bookworm_1'],
        [5, 'bookworm_2'],
        [15, 'bookworm_3'],
        [50, 'bookworm_4'],
        [100, 'bookworm_5']
      ];
      for (const [threshold, id] of bookwormThresholds) {
        if (count >= threshold) {
          const a = await checkAndGrantAchievement(userId, id);
          if (a) newAchievements.push(a);
        }
      }
      if (count >= 10) {
        const a = await checkAndGrantAchievement(userId, 'bibliophile_10');
        if (a) newAchievements.push(a);
      }
      if (count >= 50) {
        const a = await checkAndGrantAchievement(userId, 'bibliophile_50');
        if (a) newAchievements.push(a);
      }

      const now = new Date();
      const moscowHour = (now.getUTCHours() + 3) % 24;
      if (moscowHour >= 3 && moscowHour < 6) {
        const a = await checkAndGrantAchievement(userId, 'secret_night');
        if (a) newAchievements.push(a);
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentBooksCount = await prisma.bookPlacement.count({
        where: {
          tierList: { userId },
          book: { createdAt: { gte: oneHourAgo } }
        }
      });
      if (recentBooksCount >= 10) {
        const a = await checkAndGrantAchievement(userId, 'secret_speed');
        if (a) newAchievements.push(a);
      }

      if (Math.random() < 0.01) {
        const a = await checkAndGrantAchievement(userId, 'secret_lucky');
        if (a) newAchievements.push(a);
      }
      break;
    }
    case 'get_like': {
      const likesCount = await prisma.tierListLike.count({ where: { tierList: { userId } } });
      const popularThresholds: [number, AchievementId][] = [
        [10, 'popular_1'],
        [50, 'popular_2'],
        [200, 'popular_3'],
        [1000, 'popular_4']
      ];
      for (const [threshold, id] of popularThresholds) {
        if (likesCount >= threshold) {
          const a = await checkAndGrantAchievement(userId, id);
          if (a) newAchievements.push(a);
        }
      }
      if (likesCount >= 10) {
        const a = await checkAndGrantAchievement(userId, 'popular_author_10');
        if (a) newAchievements.push(a);
      }
      break;
    }
    case 'write_review': {
      const reviewCount = await prisma.book.count({
        where: {
          placements: { some: { tierList: { userId } } },
          thoughts: { not: null, notIn: [''] }
        }
      });
      const criticThresholds: [number, AchievementId][] = [
        [3, 'critic_1'],
        [10, 'critic_2'],
        [30, 'critic_3'],
        [100, 'critic_4']
      ];
      for (const [threshold, id] of criticThresholds) {
        if (reviewCount >= threshold) {
          const a = await checkAndGrantAchievement(userId, id);
          if (a) newAchievements.push(a);
        }
      }
      if (reviewCount >= 1) {
        const a = await checkAndGrantAchievement(userId, 'critic');
        if (a) newAchievements.push(a);
      }
      break;
    }
    case 'participate_battle': {
      const battleCount = await prisma.battleParticipant.count({
        where: { tierList: { userId } }
      });
      if (battleCount >= 1) {
        const a = await checkAndGrantAchievement(userId, 'fighter_1');
        if (a) newAchievements.push(a);
        const aL = await checkAndGrantAchievement(userId, 'battle_participant');
        if (aL) newAchievements.push(aL);
      }
      if (battleCount >= 10) {
        const a2 = await checkAndGrantAchievement(userId, 'fighter_2');
        if (a2) newAchievements.push(a2);
      }
      break;
    }
    case 'win_battle': {
      const userTierListIds = (await prisma.tierList.findMany({
        where: { userId },
        select: { id: true }
      })).map(tl => tl.id);

      const winCount = await prisma.battle.count({
        where: { winnerId: { in: userTierListIds } }
      });
      if (winCount >= 1) {
        const a = await checkAndGrantAchievement(userId, 'fighter_3');
        if (a) newAchievements.push(a);
        const aL = await checkAndGrantAchievement(userId, 'battle_winner');
        if (aL) newAchievements.push(aL);
      }
      if (winCount >= 20) {
        const a2 = await checkAndGrantAchievement(userId, 'fighter_4');
        if (a2) newAchievements.push(a2);
      }
      break;
    }
    case 'fork': {
       const forkedCount = await prisma.tierList.count({
         where: { userId, originalTierListId: { not: null } }
       });
       if (forkedCount >= 1) {
         const a = await checkAndGrantAchievement(userId, 'explorer');
         if (a) newAchievements.push(a);
       }
       break;
    }
  }
  return newAchievements;
}

/**
 * Получить текущее звание пользователя на основе XP
 */
export function getTitleByXP(xp: number) {
  for (let i = USER_TITLES.length - 1; i >= 0; i--) {
    const titleEntry = USER_TITLES[i];
    if (titleEntry && xp >= titleEntry.minXP) {
      return titleEntry.title;
    }
  }
  return USER_TITLES[0]?.title || 'Новичок';
}

/**
 * Ретроактивная проверка и выдача достижений для пользователя
 */
export async function syncUserAchievements(userId: number) {
  const actions: Array<'create_tier_list' | 'add_book' | 'get_like' | 'write_review' | 'participate_battle' | 'fork'> = [
    'create_tier_list', 'add_book', 'get_like', 'write_review', 'participate_battle', 'fork'
  ];

  const results = [];
  for (const action of actions) {
    const news = await processAction(userId, action);
    results.push(...news);
  }
  return results;
}

/**
 * Инициализация всех достижений
 */
export async function seedAchievements() {
  const achievements = [
    { id: 'bookworm_1', title: 'Начинающий читатель', description: 'Добавить 1 книгу в тир-лист', iconUrl: '🐛', xpValue: 10, isSecret: false },
    { id: 'bookworm_2', title: 'Любитель', description: 'Добавить 5 книг в тир-листы', iconUrl: '📖', xpValue: 25, isSecret: false },
    { id: 'bookworm_3', title: 'Знаток', description: 'Добавить 15 книг в тир-листы', iconUrl: '🤓', xpValue: 50, isSecret: false },
    { id: 'bookworm_4', title: 'Библиофил', description: 'Добавить 50 книг в тир-листы', iconUrl: '🏛️', xpValue: 100, isSecret: false },
    { id: 'bookworm_5', title: 'Вселенский читатель', description: 'Добавить 100 книг в тир-листы', iconUrl: '🌌', xpValue: 250, isSecret: false },
    { id: 'popular_1', title: 'Заметный автор', description: 'Получить 10 лайков', iconUrl: '👍', xpValue: 15, isSecret: false },
    { id: 'popular_2', title: 'Любимец публики', description: 'Получить 50 лайков', iconUrl: '🌟', xpValue: 40, isSecret: false },
    { id: 'popular_3', title: 'Звезда', description: 'Получить 200 лайков', iconUrl: '⭐', xpValue: 80, isSecret: false },
    { id: 'popular_4', title: 'Легенда', description: 'Получить 1000 лайков', iconUrl: '👑', xpValue: 200, isSecret: false },
    { id: 'critic_1', title: 'Начинающий критик', description: 'Написать 3 рецензии', iconUrl: '✍️', xpValue: 15, isSecret: false },
    { id: 'critic_2', title: 'Опытный обозреватель', description: 'Написать 10 рецензий', iconUrl: '📝', xpValue: 40, isSecret: false },
    { id: 'critic_3', title: 'Глас народа', description: 'Написать 30 рецензий', iconUrl: '📢', xpValue: 80, isSecret: false },
    { id: 'critic_4', title: 'Вершитель судеб', description: 'Написать 100 рецензий', iconUrl: '⚖️', xpValue: 200, isSecret: false },
    { id: 'curator_1', title: 'Собиратель', description: 'Создать 1 подборку', iconUrl: '🗂️', xpValue: 20, isSecret: false },
    { id: 'curator_2', title: 'Эксперт', description: 'Создать 5 подборок', iconUrl: '🎨', xpValue: 50, isSecret: false },
    { id: 'curator_3', title: 'Галерист', description: 'Создать 20 подборок', iconUrl: '🖼️', xpValue: 100, isSecret: false },
    { id: 'fighter_1', title: 'Новичок ринга', description: 'Участвовать в 1 битве', iconUrl: '🥊', xpValue: 10, isSecret: false },
    { id: 'fighter_2', title: 'Боец', description: 'Участвовать в 10 битвах', iconUrl: '🛡️', xpValue: 30, isSecret: false },
    { id: 'fighter_3', title: 'Чемпион', description: 'Выиграть 5 битв', iconUrl: '🏆', xpValue: 75, isSecret: false },
    { id: 'fighter_4', title: 'Непобедимый', description: 'Выиграть 20 битв', iconUrl: '🔥', xpValue: 150, isSecret: false },
    { id: 'secret_lucky', title: 'Счастливчик', description: 'Найти секретное достижение', iconUrl: '🍀', xpValue: 50, isSecret: true },
    { id: 'secret_night', title: 'Ночной дожор', description: 'Добавить книгу после 3:00 ночи', iconUrl: '🦉', xpValue: 50, isSecret: true },
    { id: 'secret_speed', title: 'Скорочтение', description: 'Добавить 10 книг за час', iconUrl: '⚡', xpValue: 50, isSecret: true },
    { id: 'explorer', title: 'Исследователь', description: 'Сделать форк чужого тир-листа', iconUrl: '🧭', xpValue: 15, isSecret: false },
    { id: 'first_tier_list', title: 'Первый тир-лист', description: 'Вы создали свой первый тир-лист!', iconUrl: '🆕', xpValue: 10, isSecret: false },
    { id: 'bibliophile_10', title: 'Библиофил 10', description: 'Добавлено 10 книг', iconUrl: '📚', xpValue: 20, isSecret: false },
    { id: 'bibliophile_50', title: 'Библиофил 50', description: 'Добавлено 50 книг', iconUrl: '📚', xpValue: 50, isSecret: false },
    { id: 'popular_author_10', title: 'Популярный автор', description: 'Ваш тир-лист получил 10 лайков', iconUrl: '❤️', xpValue: 30, isSecret: false },
    { id: 'battle_participant', title: 'Участник битвы', description: 'Вы приняли участие в битве', iconUrl: '⚔️', xpValue: 20, isSecret: false },
    { id: 'battle_winner', title: 'Победитель битвы', description: 'Вы победили в битве!', iconUrl: '🥇', xpValue: 100, isSecret: false },
    { id: 'critic', title: 'Критик', description: 'Написан первый отзыв', iconUrl: '✍️', xpValue: 10, isSecret: false },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }
}
