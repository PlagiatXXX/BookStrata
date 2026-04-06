import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";

// Типы для валидации
export type UpdateAvatarInput = {
  avatarUrl?: string;
};

export type UpdateUserInput = {
  username: string;
};

export type ChangePasswordInput = {
  current_password: string;
  new_password: string;
};

// Эндпоинты для работы с профилем пользователя

// GET /api/users/me - получить текущего пользователя
export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      isPro: true,
      proExpiresAt: true,
      role: {
        select: {
          name: true,
        },
      },
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  // Проверяем, не истёк ли срок подписки
  const isExpired = user.proExpiresAt && user.proExpiresAt < new Date();
  const actualIsPro = user.isPro && !isExpired;

  return {
    ...user,
    isPro: actualIsPro,
    proExpiresAt: isExpired ? null : user.proExpiresAt,
    role: user.role?.name || undefined,
  };
}

// PUT /api/users/me - обновить профиль пользователя
export async function updateUser(userId: number, username: string) {
  // Проверка на уникальность имени
  const existing = await prisma.user.findFirst({
    where: {
      username,
      NOT: { id: userId },
    },
  });

  if (existing) {
    throw new Error("Это имя пользователя уже занято");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { username },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
}

// PUT /api/users/me/avatar - обновить аватар
export async function updateAvatar(userId: number, avatarUrl: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: avatarUrl },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
    },
  });
}

// DELETE /api/users/me/avatar - удалить аватар
export async function deleteAvatar(userId: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
    },
  });
}

// PUT /api/users/me/password - сменить пароль
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
) {
  // Получаем пользователя с хешем пароля
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  // Проверяем текущий пароль
  const isValidPassword = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );
  if (!isValidPassword) {
    throw new Error("Неверный текущий пароль");
  }

  // Хешируем новый пароль
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Обновляем пароль
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { success: true, message: "Пароль успешно изменён" };
}

// GET /api/users/:id - получить пользователя по ID (публичный профиль)
export async function getUserById(params: { id: string }) {
  const userId = parseInt(params.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  return user;
}

// Статистика пользователя
export interface UserStats {
  tierListsCount: number;
  templatesCount: number;
  likesCount: number;
  likesTodayCount: number;
}

// GET /api/users/me/stats - получить статистику пользователя
export async function getUserStats(userId: number) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Оптимизация Bolt: выполняем запросы параллельно и используем агрегацию для лайков
  const [tierListsCount, templatesCount, totalLikesResult, likesTodayCount] =
    await Promise.all([
      // Количество тир-листов
      prisma.tierList.count({ where: { userId } }),

      // Количество шаблонов
      prisma.template.count({ where: { authorId: userId } }),

      // Общее количество лайков на тир-листах пользователя
      prisma.tierListLike.count({
        where: {
          tierList: { userId },
        },
      }),

      // Лайки за последние 24 часа (остается через count, т.к. нет денормализованного поля за период)
      prisma.tierListLike.count({
        where: {
          tierList: { userId },
          createdAt: { gte: oneDayAgo },
        },
      }),
    ]);

  return {
    tierListsCount,
    templatesCount,
    likesCount: totalLikesResult,
    likesTodayCount,
  };
}

/**
 * Получить всех пользователей (только для администраторов)
 */
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      isPro: true,
      proExpiresAt: true,
      role: {
        select: {
          name: true,
        },
      },
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map((user) => ({
    userId: user.id,
    email: user.email,
    username: user.username,
    isPro: user.isPro,
    proExpiresAt: user.proExpiresAt?.toISOString() || null,
    role: user.role?.name || "user",
    createdAt: user.createdAt.toISOString(),
  }));
}
