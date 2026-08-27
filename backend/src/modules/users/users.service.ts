import { prisma } from "../../lib/prisma.js";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../lib/errors.js";
import bcrypt from "bcryptjs";
import { tierListRepository } from "../../repositories/index.js";
import { getTitleEntryByXP } from "../achievements/achievements.service.js";

// Типы для валидации
export type UpdateAvatarInput = {
  avatarUrl?: string;
};

export type UpdateUserInput = {
  username: string;
  bio?: string | null;
  socialLinks?: SocialLink[] | null;
};

export type SocialLink = {
  platform: string;
  url: string;
};

export type ChangePasswordInput = {
  current_password: string;
  new_password: string;
};

// Select для публичных данных профиля (используется во всех запросах своего профиля)
const userProfileSelect = {
  id: true,
  email: true,
  username: true,
  avatarUrl: true,
  bio: true,
  socialLinks: true,
  role: {
    select: { name: true },
  },
  createdAt: true,
} as const;

// GET /api/users/me - получить текущего пользователя
export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userProfileSelect,
  });

  if (!user) {
    throw new NotFoundError("Пользователь не найден");
  }

  return {
    ...user,
    role: user.role?.name || undefined,
  };
}

// PUT /api/users/me - обновить профиль пользователя
export async function updateUser(userId: number, input: UpdateUserInput) {
  const { username, bio, socialLinks } = input;

  if (username) {
    const existing = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existing) {
      throw new ConflictError("Это имя пользователя уже занято");
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(username && { username }),
      bio: bio ?? undefined,
      socialLinks: socialLinks ?? undefined,
    },
    select: userProfileSelect,
  });
}

// PUT /api/users/me/avatar - обновить аватар
export async function updateAvatar(userId: number, avatarUrl: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: avatarUrl },
    select: userProfileSelect,
  });
}

// DELETE /api/users/me/avatar - удалить аватар
export async function deleteAvatar(userId: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
    select: userProfileSelect,
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
    throw new NotFoundError("Пользователь не найден");
  }

  // Проверяем текущий пароль
  const isValidPassword = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );
  if (!isValidPassword) {
    throw new ValidationError("Неверный текущий пароль");
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
      bio: true,
      socialLinks: true,
      xp: true,
      title: true,
      isDonor: true,
      role: {
        select: { name: true },
      },
      createdAt: true,
      badges: {
        select: { id: true, text: true, color: true, createdAt: true },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });

  if (!user) {
    throw new NotFoundError("Пользователь не найден");
  }

  // Статистика
  const [tierListStats, publishedCount, placementCount, lastUpdated] =
    await Promise.all([
      tierListRepository.aggregateUserStats(userId),
      prisma.tierList.count({ where: { userId, isPublic: true } }),
      prisma.bookPlacement.count({ where: { tierList: { userId } } }),
      prisma.tierList.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);

  const titleEntry = getTitleEntryByXP(user.xp);

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    socialLinks: user.socialLinks,
    xp: user.xp,
    title: user.title,
    icon: titleEntry.icon,
    isDonor: user.isDonor,
    role: user.role?.name ?? null,
    badges: user.badges,
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

  const [
    tierListStats,
    templatesCount,
    likesTodayCount,
    publishedCount,
    placementCount,
    lastUpdated,
    userRow,
  ] = await Promise.all([
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
    prisma.user.findUnique({
      where: { id: userId },
      select: { totalActiveMinutes: true },
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
    totalActiveMinutes: userRow?.totalActiveMinutes ?? 0,
  };
}

// GET /api/users/me/activity-timeline — активность по месяцам (книги/лайки)
export interface TimelineMonthRow {
  month: Date;
  count: number;
}

export interface TimelinePoint {
  month: string; // "2026-03"
  books: number;
  likes: number;
}

/** Непрерывный ряд месяцев (пропуски → нули). Даты — UTC. */
export function buildTimelineSeries(
  months: number,
  now: Date,
  booksRows: TimelineMonthRow[],
  likesRows: TimelineMonthRow[],
): TimelinePoint[] {
  const key = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const booksMap = new Map(booksRows.map((r) => [key(new Date(r.month)), Number(r.count)]));
  const likesMap = new Map(likesRows.map((r) => [key(new Date(r.month)), Number(r.count)]));

  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  cursor.setUTCMonth(cursor.getUTCMonth() - (months - 1));

  const series: TimelinePoint[] = [];
  for (let i = 0; i < months; i++) {
    const k = key(cursor);
    series.push({ month: k, books: booksMap.get(k) ?? 0, likes: likesMap.get(k) ?? 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return series;
}

export async function getActivityTimeline(userId: number, months = 6): Promise<TimelinePoint[]> {
  const safeMonths = Math.min(Math.max(Math.trunc(months) || 6, 1), 12);
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCMonth(since.getUTCMonth() - (safeMonths - 1));

  const [booksRows, likesRows] = await Promise.all([
    prisma.$queryRaw<TimelineMonthRow[]>`
      SELECT date_trunc('month', bp."created_at") AS month, COUNT(*)::int AS count
      FROM "BookPlacement" bp
      JOIN "tier_lists" tl ON tl."id" = bp."tierListId"
      WHERE tl."userId" = ${userId} AND bp."created_at" >= ${since}
      GROUP BY 1 ORDER BY 1
    `,
    prisma.$queryRaw<TimelineMonthRow[]>`
      SELECT date_trunc('month', l."created_at") AS month, COUNT(*)::int AS count
      FROM "TierListLike" l
      JOIN "tier_lists" tl ON tl."id" = l."tierListId"
      WHERE tl."userId" = ${userId} AND l."created_at" >= ${since}
      GROUP BY 1 ORDER BY 1
    `,
  ]);

  return buildTimelineSeries(safeMonths, new Date(), booksRows, likesRows);
}

// GET /api/users/:id/tier-lists — публичные тир-листы пользователя
export async function getUserPublicTierLists(
  userId: number,
  page: number,
  pageSize: number,
) {
  const [data, totalItems] = await tierListRepository.findPublicByUserId(
    userId,
    { page, pageSize },
  );

  const transformed = data.map((tl) => ({
    ...tl,
    booksCount: tl._count?.placements ?? 0,
    _count: undefined,
  }));

  return { data: transformed, totalItems };
}

// Тип книги для /me/books
export interface MyBook {
  id: number;
  title: string;
  author: string | null;
  coverImageUrl: string;
  description: string | null;
  genre: string | null;
  tags: string[];
  tierListId: string;
  tierListTitle: string;
  createdAt: string;
}

// GET /api/users/me/books — все книги пользователя (из его тир-листов)
export async function getMyBooks(userId: number): Promise<MyBook[]> {
  // Получаем все placements пользователя с книгой и тир-листом
  const placements = await prisma.bookPlacement.findMany({
    where: {
      tierList: { userId },
    },
    include: {
      book: true,
      tierList: { select: { id: true, title: true } },
    },
    orderBy: { tierList: { updatedAt: "desc" } },
  });

  // Дедикация: если книга есть в нескольких тир-листах, берём из самого свежего
  const seenBookIds = new Set<number>();
  const books: MyBook[] = [];

  for (const p of placements) {
    if (seenBookIds.has(p.bookId)) continue;
    seenBookIds.add(p.bookId);

    books.push({
      id: p.book.id,
      title: p.book.title,
      author: p.book.author,
      coverImageUrl: p.book.coverImageUrl,
      description: p.book.description,
      genre: p.book.genre,
      tags: p.book.tags,
      tierListId: p.tierList.id,
      tierListTitle: p.tierList.title,
      createdAt: p.book.createdAt.toISOString(),
    });
  }

  return books;
}

// GET /api/users/me/tier-lists — все тир-листы текущего пользователя (включая приватные)
export async function getMyTierLists(
  userId: number,
  page: number,
  pageSize: number,
) {
  const [data, totalItems] = await tierListRepository.findByUser(userId, {
    page,
    pageSize,
  });

  const transformed = data.map((tl) => ({
    ...tl,
    booksCount: tl._count?.placements ?? 0,
    _count: undefined,
  }));

  return { data: transformed, totalItems };
}

// GET /api/users/:id/taste-match — совпадение вкусов с текущим пользователем
export async function getTasteMatch(
  targetUserId: number,
  currentUserId: number | null,
) {
  // Неавторизованный посетитель — текущего пользователя нет, совпадение нулевое
  if (!currentUserId) {
    return { matchPercent: 0, commonBooks: 0, totalBooks: 0 };
  }

  // Получаем все ID публичных тир-листов целевого пользователя
  const targetListIds =
    await tierListRepository.findUserTierListIds(targetUserId);

  if (targetListIds.length === 0) {
    return { matchPercent: 0, commonBooks: 0, totalBooks: 0 };
  }

  // Получаем все книги из тир-листов целевого пользователя
  const targetPlacements = await prisma.bookPlacement.findMany({
    where: { tierListId: { in: targetListIds } },
    include: { book: { select: { title: true, author: true } } },
  });

  // Получаем все книги текущего пользователя
  const userListIds =
    await tierListRepository.findUserTierListIds(currentUserId);
  const userPlacements =
    userListIds.length > 0
      ? await prisma.bookPlacement.findMany({
          where: { tierListId: { in: userListIds } },
          include: { book: { select: { title: true, author: true } } },
        })
      : [];

  // Строим Set книг текущего пользователя (normalizeKey)
  const userBookKeys = new Set(
    userPlacements.map(
      (p) =>
        `${p.book.title.toLowerCase().trim()}|${(p.book.author ?? "").toLowerCase().trim()}`,
    ),
  );

  // Считаем совпадения среди книг целевого пользователя
  const targetBookKeys = new Set(
    targetPlacements.map(
      (p) =>
        `${p.book.title.toLowerCase().trim()}|${(p.book.author ?? "").toLowerCase().trim()}`,
    ),
  );

  let commonBooks = 0;
  for (const key of targetBookKeys) {
    if (userBookKeys.has(key)) commonBooks++;
  }

  const totalUnique = targetBookKeys.size + userBookKeys.size - commonBooks;

  return {
    matchPercent:
      totalUnique > 0 ? Math.round((commonBooks / totalUnique) * 100) : 0,
    commonBooks,
    totalBooks: targetBookKeys.size,
  };
}

// Тип для результатов поиска (публичные данные)
export interface UserSearchResult {
  id: number;
  username: string;
  avatarUrl: string | null;
  isDonor: boolean;
  xp: number;
  title: string | null;
  icon: string | null;
  role: string | null;
}

// GET /api/users/search?q= — поиск пользователей по нику
export async function searchUsers(q: string): Promise<UserSearchResult[]> {
  if (!q || q.trim().length < 1) return [];

  const users = await prisma.user.findMany({
    where: {
      username: {
        startsWith: q.trim(),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      xp: true,
      title: true,
      isDonor: true,
      role: {
        select: { name: true },
      },
    },
    orderBy: { xp: "desc" },
    take: 20,
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    isDonor: user.isDonor,
    xp: user.xp,
    title: user.title,
    icon: null,
    role: user.role?.name ?? null,
  }));
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
      isDonor: true,
      lastActivityAt: true,
      totalActiveMinutes: true,
      role: {
        select: {
          name: true,
        },
      },
      createdAt: true,
      badges: {
        select: { id: true, text: true, color: true },
        orderBy: { createdAt: "asc" as const },
      },
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
    isDonor: user.isDonor,
    proExpiresAt: user.proExpiresAt?.toISOString() || null,
    lastActivityAt: user.lastActivityAt?.toISOString() || null,
    totalActiveMinutes: user.totalActiveMinutes,
    role: user.role?.name || "user",
    createdAt: user.createdAt.toISOString(),
    badges: user.badges.map((b) => ({
      id: b.id,
      text: b.text,
      color: b.color,
    })),
  }));
}

export async function getViolators() {
  const now = new Date();
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
  });

  return users.map((user) => {
    const actions: Array<{
      type: "chat_ban" | "suspension" | "warning";
      date: string;
      until: string | null;
      reason: string | null;
      moderator: { id: number; username: string } | null;
    }> = [];

    if (
      user.chatBannedAt &&
      (!user.chatBannedUntil || user.chatBannedUntil > now)
    ) {
      actions.push({
        type: "chat_ban",
        date: user.chatBannedAt.toISOString(),
        until: user.chatBannedUntil?.toISOString() ?? null,
        reason: null,
        moderator: null,
      });
    }

    if (
      user.suspendedAt &&
      (!user.suspendedUntil || user.suspendedUntil > now)
    ) {
      actions.push({
        type: "suspension",
        date: user.suspendedAt.toISOString(),
        until: user.suspendedUntil?.toISOString() ?? null,
        reason: user.suspensionReason,
        moderator: null,
      });
    }

    const lastWarning = user.warnings[0];
    if (lastWarning) {
      actions.push({
        type: "warning" as const,
        date: lastWarning.createdAt.toISOString(),
        until: null,
        reason: lastWarning.message,
        moderator: {
          id: lastWarning.moderator.id,
          username: lastWarning.moderator.username ?? "—",
        },
      });
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role?.name ?? "user",
      warningsCount: user._count.warnings,
      actions: actions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };
  });
}

// POST /api/users/heartbeat — пульс активности (раз в минуту от фронта)
export async function heartbeat(userId: number) {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "total_active_minutes" = "total_active_minutes" + 1,
        "last_activity_at" = NOW()
    WHERE "id" = ${userId}
  `;
  return { ok: true };
}

// Установить/снять статус донатера (мецената)
export async function setDonorStatus(userId: number, isDonor: boolean) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isDonor,
      donatedAt: isDonor ? new Date() : null,
    },
    select: {
      id: true,
      username: true,
      isDonor: true,
      donatedAt: true,
    },
  });
  return user;
}

// ── Custom Badges ──

export type BadgeColor = "purple" | "blue" | "amber" | "green" | "red" | "cyan";

export type UserBadge = {
  id: number;
  text: string;
  color: BadgeColor;
  createdAt: string;
};

export async function getUserBadges(userId: number): Promise<UserBadge[]> {
  const badges = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return badges.map((b) => ({
    id: b.id,
    text: b.text,
    color: b.color as BadgeColor,
    createdAt: b.createdAt.toISOString(),
  }));
}

export async function addUserBadge(
  userId: number,
  text: string,
  color: BadgeColor,
): Promise<UserBadge> {
  const count = await prisma.userBadge.count({ where: { userId } });
  if (count >= 5) {
    throw new ValidationError("Максимум 5 бейджей на пользователя");
  }

  const badge = await prisma.userBadge.create({
    data: { userId, text: text.trim(), color },
  });
  return {
    id: badge.id,
    text: badge.text,
    color: badge.color as BadgeColor,
    createdAt: badge.createdAt.toISOString(),
  };
}

export async function updateUserBadge(
  badgeId: number,
  text: string,
  color: BadgeColor,
): Promise<UserBadge> {
  const badge = await prisma.userBadge.update({
    where: { id: badgeId },
    data: { text: text.trim(), color },
  });
  return {
    id: badge.id,
    text: badge.text,
    color: badge.color as BadgeColor,
    createdAt: badge.createdAt.toISOString(),
  };
}

export async function deleteUserBadge(badgeId: number): Promise<void> {
  await prisma.userBadge.delete({ where: { id: badgeId } });
}
