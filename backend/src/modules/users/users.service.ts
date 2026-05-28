import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import { tierListRepository } from "../../repositories/index.js";

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
      isPro: true,
      proExpiresAt: true,
      xp: true,
      title: true,
      role: {
        select: { name: true },
      },
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  // Проверяем, не истёк ли срок подписки
  const isExpired = user.proExpiresAt && user.proExpiresAt < new Date();

  // Статистика
  const [tierListStats, publishedCount, placementCount, lastUpdated] = await Promise.all([
    tierListRepository.aggregateUserStats(userId),
    prisma.tierList.count({ where: { userId, isPublic: true } }),
    prisma.bookPlacement.count({ where: { tierList: { userId } } }),
    prisma.tierList.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    isPro: user.isPro && !isExpired,
    xp: user.xp,
    title: user.title,
    role: user.role?.name ?? null,
    createdAt: user.createdAt,
    stats: {
      tierListsCount: tierListStats._count._all,
      publishedCount,
      likesCount: tierListStats._sum.likesCount || 0,
      totalBooks: placementCount,
      lastActivity: lastUpdated?.updatedAt.toISOString() ?? null,
    },
  };
}

// Статистика пользователя
export interface UserStats {
  tierListsCount: number;
  publishedCount: number;
  templatesCount: number;
  likesCount: number;
  likesTodayCount: number;
  totalBooks: number;
  lastActivity: string | null;
}

// GET /api/users/me/stats - получить статистику пользователя
export async function getUserStats(userId: number) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [tierListStats, templatesCount, likesTodayCount, publishedCount, placementCount, lastUpdated] = await Promise.all([
    tierListRepository.aggregateUserStats(userId),
    prisma.template.count({ where: { authorId: userId } }),
    prisma.tierListLike.count({
      where: {
        tierList: { userId },
        createdAt: { gte: oneDayAgo },
      },
    }),
    prisma.tierList.count({
      where: { userId, isPublic: true },
    }),
    prisma.bookPlacement.count({
      where: { tierList: { userId } },
    }),
    prisma.tierList.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  return {
    tierListsCount: tierListStats._count._all,
    publishedCount,
    templatesCount,
    likesCount: tierListStats._sum.likesCount || 0,
    likesTodayCount,
    totalBooks: placementCount,
    lastActivity: lastUpdated?.updatedAt.toISOString() ?? null,
  };
}

// GET /api/users/:id/tier-lists — публичные тир-листы пользователя
export async function getUserPublicTierLists(
  userId: number,
  page: number,
  pageSize: number,
) {
  const [data, totalItems] = await tierListRepository.findPublicByUserId(userId, { page, pageSize });

  const transformed = data.map((tl: any) => ({
    ...tl,
    booksCount: tl._count?.placements ?? 0,
    _count: undefined,
  }));

  return { data: transformed, totalItems };
}

// GET /api/users/:id/taste-match — совпадение вкусов с текущим пользователем
export async function getTasteMatch(targetUserId: number, currentUserId: number) {
  // Получаем все ID публичных тир-листов целевого пользователя
  const targetListIds = await tierListRepository.findUserTierListIds(targetUserId);

  if (targetListIds.length === 0) {
    return { matchPercent: 0, commonBooks: 0, totalBooks: 0 };
  }

  // Получаем все книги из тир-листов целевого пользователя
  const targetPlacements = await prisma.bookPlacement.findMany({
    where: { tierListId: { in: targetListIds } },
    include: { book: { select: { title: true, author: true } } },
  });

  // Получаем все книги текущего пользователя
  const userListIds = await tierListRepository.findUserTierListIds(currentUserId);
  const userPlacements = userListIds.length > 0
    ? await prisma.bookPlacement.findMany({
        where: { tierListId: { in: userListIds } },
        include: { book: { select: { title: true, author: true } } },
      })
    : [];

  // Строим Set книг текущего пользователя (normalizeKey)
  const userBookKeys = new Set(
    userPlacements.map((p) => `${p.book.title.toLowerCase().trim()}|${(p.book.author ?? "").toLowerCase().trim()}`),
  );

  // Считаем совпадения среди книг целевого пользователя
  const targetBookKeys = new Set(
    targetPlacements.map((p) => `${p.book.title.toLowerCase().trim()}|${(p.book.author ?? "").toLowerCase().trim()}`),
  );

  let commonBooks = 0;
  for (const key of targetBookKeys) {
    if (userBookKeys.has(key)) commonBooks++;
  }

  const totalUnique = targetBookKeys.size + userBookKeys.size - commonBooks;

  return {
    matchPercent: totalUnique > 0 ? Math.round((commonBooks / totalUnique) * 100) : 0,
    commonBooks,
    totalBooks: targetBookKeys.size,
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

export async function getViolators() {
  const now = new Date()
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { chatBannedAt: { not: null } },
        { suspendedAt: { not: null } },
        { warnings: { some: {} } },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      chatBannedAt: true,
      chatBannedUntil: true,
      suspendedAt: true,
      suspendedUntil: true,
      suspensionReason: true,
      role: { select: { name: true } },
      warnings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          message: true,
          createdAt: true,
          moderator: { select: { id: true, username: true } },
        },
      },
      _count: { select: { warnings: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return users.map((user) => {
    const actions: Array<{
      type: "chat_ban" | "suspension" | "warning"
      date: string
      until: string | null
      reason: string | null
      moderator: { id: number; username: string } | null
    }> = []

    if (user.chatBannedAt && (!user.chatBannedUntil || user.chatBannedUntil > now)) {
      actions.push({
        type: "chat_ban",
        date: user.chatBannedAt.toISOString(),
        until: user.chatBannedUntil?.toISOString() ?? null,
        reason: null,
        moderator: null,
      })
    }

    if (user.suspendedAt && (!user.suspendedUntil || user.suspendedUntil > now)) {
      actions.push({
        type: "suspension",
        date: user.suspendedAt.toISOString(),
        until: user.suspendedUntil?.toISOString() ?? null,
        reason: user.suspensionReason,
        moderator: null,
      })
    }

    const lastWarning = user.warnings[0]
    if (lastWarning) {
      actions.push({
        type: "warning" as const,
        date: lastWarning.createdAt.toISOString(),
        until: null,
        reason: lastWarning.message,
        moderator: { id: lastWarning.moderator.id, username: lastWarning.moderator.username ?? "—" },
      })
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role?.name ?? "user",
      warningsCount: user._count.warnings,
      actions: actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }
  })
}
