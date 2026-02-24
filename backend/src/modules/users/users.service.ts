import { prisma } from '../../lib/prisma.js';
import bcrypt from 'bcryptjs';

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
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error('Пользователь не найден');
  }

  return user;
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
    throw new Error('Это имя пользователя уже занято');
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
export async function updateAvatar(
  userId: number,
  avatarUrl: string | null
) {
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
  newPassword: string
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
    throw new Error('Пользователь не найден');
  }

  // Проверяем текущий пароль
  const isValidPassword = await bcrypt.compare(
    currentPassword, 
    user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Неверный текущий пароль');
  }

  // Хешируем новый пароль
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Обновляем пароль
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { success: true, message: 'Пароль успешно изменён' };
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
    throw new Error('Пользователь не найден');
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

  // Количество тир-листов
  const tierListsCount = await prisma.tierList.count({
    where: { userId },
  });

  // Количество шаблонов
  const templatesCount = await prisma.template.count({
    where: { authorId: userId },
  });

  // Общее количество лайков на тир-листах пользователя
  const likesCount = await prisma.tierListLike.count({
    where: {
      tierList: { userId },
    },
  });

  // Лайки за последние 24 часа
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const likesTodayCount = await prisma.tierListLike.count({
    where: {
      tierList: { userId },
      createdAt: { gte: oneDayAgo },
    },
  });

  return {
    tierListsCount,
    templatesCount,
    likesCount,
    likesTodayCount,
  };
}
