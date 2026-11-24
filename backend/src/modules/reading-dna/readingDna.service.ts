/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import { createBookWithSlug } from "../../lib/slug.js";
import { createAuthorService } from "../authors/authors.service.js";
import {
  resolveArchetype,
  calculateCompatibility,
  ARCHETYPES,
  type CompatibilityResult,
} from "./compatibility.calculator.js";
import type {
  ReadingDnaInput,
  ReadingDnaResponse,
  ReadingDnaDuelInput,
  DnaBookItem,
  ArchetypeCatalogItem,
} from "./readingDna.schema.js";
import { MAX_DNA_RETESTS } from "./readingDna.schema.js";

/**
 * Генерирует уникальный номер читательского билета вида BS-7492-X.
 */
function generateTicketNumber(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `BS-${digits}-${letter}`;
}

/**
 * Генерирует короткий код для шеринг-ссылок.
 */
function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Проверяет, что ошибка Prisma — нарушение уникального ограничения (P2002).
 */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Преобразует запись Prisma reading_dna в контракт ответа ReadingDnaResponse.
 */
function toResponse(record: any): ReadingDnaResponse {
  const retestCount = typeof record.retestCount === "number" ? record.retestCount : 0;
  const retestsLeft = Math.max(0, MAX_DNA_RETESTS - retestCount);

  return {
    id: record.id,
    ticketNumber: record.ticketNumber,
    customName: record.customName,
    archetype: record.archetype,
    archetypeName: record.archetypeName,
    archetypeDesc: record.archetypeDesc,
    motto: record.motto,
    theme: record.theme,
    axes: {
      storyFocus: record.storyFocus,
      emotionalWeight: record.emotionalWeight,
      pace: record.pace,
      darkness: record.darkness,
      scope: record.scope,
      complexity: record.complexity,
    },
    favoriteBooks: record.favoriteBooks as DnaBookItem[],
    kryptoniteBook: (record.kryptoniteBook as DnaBookItem) ?? null,
    likedGenres: record.likedGenres,
    dislikedGenres: record.dislikedGenres,
    favoriteAuthors: record.favoriteAuthors,
    shareUrl: record.shareUrl,
    shortCode: record.shortCode,
    qrCodeUrl: record.qrCodeUrl,
    ticketImageUrl: record.ticketImageUrl,
    viewsCount: record.viewsCount,
    shareCount: record.shareCount,
    duelsCount: record.duelsCount,
    retestCount,
    retestsLeft,
    createdAt: record.createdAt,
  };
}

/**
 * Превью билета без сохранения в базу данных.
 */
export async function previewDna(input: ReadingDnaInput): Promise<{
  archetype: string;
  archetypeName: string;
  archetypeDesc: string;
  motto: string;
  specialSign: string;
  axes: typeof input.axes;
  favoriteBooks: typeof input.favoriteBooks;
  kryptoniteBook: typeof input.kryptoniteBook;
  theme: string;
}> {
  const archetypeDef = resolveArchetype(input.axes);
  const archetypeName =
    input.theme === "craft" ? archetypeDef.names.craft : archetypeDef.names.dark;

  return {
    archetype: archetypeDef.id,
    archetypeName,
    archetypeDesc: archetypeDef.description,
    motto: archetypeDef.quote,
    specialSign: archetypeDef.specialSign,
    axes: input.axes,
    favoriteBooks: input.favoriteBooks,
    kryptoniteBook: input.kryptoniteBook,
    theme: input.theme,
  };
}

/**
 * Автоматически находит или регистрирует книгу в каталоге BookStrata.
 * Позволяет святыням из Google Books и ручного ввода автоматически пополнять каталог платформы.
 */
async function resolveOrCreateDnaBook(item: DnaBookItem): Promise<DnaBookItem> {
  if (item.bookId) {
    return item;
  }

  const cleanTitle = (item.title || "").trim();
  if (!cleanTitle) return item;

  const cleanAuthor = item.author?.trim() || null;

  try {
    if (!prisma.book) return item;

    // 1. Проверяем, существует ли уже такая книга в БД BookStrata
    const existing = await prisma.book.findFirst({
      where: {
        title: { equals: cleanTitle, mode: "insensitive" },
        ...(cleanAuthor ? { author: { equals: cleanAuthor, mode: "insensitive" } } : {}),
      },
      select: { id: true, title: true, author: true, coverImageUrl: true },
      orderBy: { createdAt: "asc" },
    });

    if (existing) {
      return {
        ...item,
        bookId: existing.id,
        author: item.author || existing.author || undefined,
        coverImageUrl: item.coverImageUrl || existing.coverImageUrl || undefined,
      };
    }

    // 2. Если книги нет — создаем её в каталоге (пополняя базу платформы)
    let authorId: number | null = null;
    if (cleanAuthor) {
      try {
        const authorService = createAuthorService(prisma);
        const authorRecord = await authorService.findOrCreate(cleanAuthor);
        authorId = authorRecord.id;
      } catch {
        // не прерываем сохранение, если создание автора упало
      }
    }

    const created = await createBookWithSlug(prisma, {
      title: cleanTitle,
      author: cleanAuthor,
      authorId,
      coverImageUrl: item.coverImageUrl || "",
      source: "google_books",
      status: "draft",
    });

    return {
      ...item,
      bookId: created.id,
    };
  } catch {
    return item;
  }
}

/**
 * Сохранение / обновление читательского ДНК.
 */
export async function saveDna(
  input: ReadingDnaInput,
  userId?: number
): Promise<ReadingDnaResponse> {
  const archetypeDef = resolveArchetype(input.axes);
  const archetypeName =
    input.theme === "craft" ? archetypeDef.names.craft : archetypeDef.names.dark;

  // Автоматически связываем или регистрируем книги в каталоге
  const resolvedFavoriteBooks = await Promise.all(
    (input.favoriteBooks || []).map((b) => resolveOrCreateDnaBook(b))
  );
  const resolvedKryptoniteBook = input.kryptoniteBook
    ? await resolveOrCreateDnaBook(input.kryptoniteBook)
    : null;

  const favoriteBookIds = resolvedFavoriteBooks
    .map((b) => b.bookId)
    .filter((id): id is number => typeof id === "number");

  const kryptoniteBookId = resolvedKryptoniteBook?.bookId ?? null;

  const basePayload = {
    customName: input.customName ?? null,
    archetype: archetypeDef.id,
    archetypeName,
    archetypeDesc: archetypeDef.description,
    motto: archetypeDef.quote,
    storyFocus: input.axes.storyFocus,
    emotionalWeight: input.axes.emotionalWeight,
    pace: input.axes.pace,
    darkness: input.axes.darkness,
    scope: input.axes.scope,
    complexity: input.axes.complexity,
    favoriteBooks: resolvedFavoriteBooks as any,
    kryptoniteBook: resolvedKryptoniteBook ? (resolvedKryptoniteBook as any) : undefined,
    favoriteBookIds,
    kryptoniteBookId,
    likedGenres: input.likedGenres,
    dislikedGenres: input.dislikedGenres,
    favoriteAuthors: input.favoriteAuthors,
    theme: input.theme,
  };

  // 1. Если билет уже существует для зарегистрированного пользователя или гостя —
  // обновляем профиль, сохраняя исходный постоянный номер билета и ссылки (чтобы ссылки в чатах не ломались).
  if (userId) {
    const existingUserTicket = await prisma.readingDna.findUnique({
      where: { userId },
    });
    if (existingUserTicket) {
      if ((existingUserTicket.retestCount ?? 0) >= MAX_DNA_RETESTS) {
        throw new Error(
          `Лимит повторных калибровок исчерпан (максимум ${MAX_DNA_RETESTS} перекалибровки на аккаунт)`
        );
      }
      const updated = await prisma.readingDna.update({
        where: { id: existingUserTicket.id },
        data: {
          ...basePayload,
          retestCount: { increment: 1 },
        },
      });
      return toResponse(updated);
    }
  } else if (input.guestToken) {
    const existingGuestTicket = await prisma.readingDna.findUnique({
      where: { guestToken: input.guestToken },
    });
    if (existingGuestTicket) {
      throw new Error(
        "Для повторной калибровки билета необходимо войти или зарегистрироваться"
      );
    }
  }

  // 2. Первичное создание билета с генерацией уникального номера
  const MAX_ATTEMPTS = 5;
  let savedRecord: any;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const ticketNumber = generateTicketNumber();
    const shortCode = generateShortCode();
    const shareUrl = `https://bookstrata.ru/reading-dna?ticket=${ticketNumber}`;
    const dataPayload = { ...basePayload, shareUrl, shortCode };

    try {
      if (userId) {
        savedRecord = await prisma.readingDna.create({
          data: {
            ...dataPayload,
            userId,
            ticketNumber,
          },
        });
      } else {
        savedRecord = await prisma.readingDna.create({
          data: {
            ...dataPayload,
            guestToken: input.guestToken ?? null,
            ticketNumber,
          },
        });
      }
      break;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      lastError = error;
    }
  }

  if (!savedRecord) throw lastError;

  return toResponse(savedRecord);
}

/**
 * Получение билета по ticketNumber или shortCode с инкрементом просмотров.
 */
export async function getTicket(
  ticketNumberOrCode: string
): Promise<ReadingDnaResponse | null> {
  const record = await prisma.readingDna.findFirst({
    where: {
      OR: [
        { ticketNumber: ticketNumberOrCode },
        { shortCode: ticketNumberOrCode },
      ],
    },
  });

  if (!record) return null;

  // Инкрементируем просмотры
  await prisma.readingDna.update({
    where: { id: record.id },
    data: { viewsCount: { increment: 1 } },
  });

  return toResponse(record);
}

/**
 * Получение ДНК пользователя по userId.
 */
export async function getMyDna(userId: number): Promise<ReadingDnaResponse | null> {
  const record = await prisma.readingDna.findUnique({
    where: { userId },
  });

  if (!record) return null;

  return toResponse(record);
}

/**
 * Привязка гостевого билета к авторизованному пользователю.
 * Сначала проверяет, есть ли у пользователя уже билет (защита от P2002):
 * если есть — возвращает существующий без ошибки.
 */
export async function claimGuestDna(
  guestToken: string,
  userId: number,
): Promise<{ claimed: boolean; dna: ReadingDnaResponse } | null> {
  const existingUserDna = await prisma.readingDna.findUnique({
    where: { userId },
  });
  if (existingUserDna) {
    return { claimed: false, dna: toResponse(existingUserDna) };
  }

  const updated = await prisma.readingDna.updateMany({
    where: { guestToken, userId: null },
    data: { userId, guestToken: null },
  });

  if (updated.count === 0) {
    return null;
  }

  const claimedRecord = await prisma.readingDna.findUnique({
    where: { userId },
  });
  if (!claimedRecord) return null;

  return { claimed: true, dna: toResponse(claimedRecord) };
}

/**
 * Инкремент счётчика шеринга билета.
 */
export async function incrementShareCount(
  ticketNumber: string
): Promise<number | null> {
  const record = await prisma.readingDna.findFirst({
    where: {
      OR: [{ ticketNumber }, { shortCode: ticketNumber }],
    },
  });

  if (!record) return null;

  const updated = await prisma.readingDna.update({
    where: { id: record.id },
    data: { shareCount: { increment: 1 } },
    select: { shareCount: true },
  });

  return updated.shareCount;
}

/**
 * Проведение литературной дуэли.
 */
export async function conductDuel(
  input: ReadingDnaDuelInput
): Promise<CompatibilityResult & { targetTicketNumber: string }> {
  const target = await prisma.readingDna.findUnique({
    where: { ticketNumber: input.targetTicketNumber },
  });

  if (!target) {
    throw new NotFoundError(
      `Билет с номером «${input.targetTicketNumber}» не найден`
    );
  }

  let challengerProfile: ReadingDnaInput;
  let challengerDnaId: number | null = null;

  if (input.challengerTicketNumber) {
    const challengerRecord = await prisma.readingDna.findUnique({
      where: { ticketNumber: input.challengerTicketNumber },
    });
    if (!challengerRecord) {
      throw new NotFoundError(
        `Билет оппонента «${input.challengerTicketNumber}» не найден`
      );
    }
    challengerDnaId = challengerRecord.id;
    challengerProfile = {
      axes: {
        storyFocus: challengerRecord.storyFocus,
        emotionalWeight: challengerRecord.emotionalWeight,
        pace: challengerRecord.pace,
        darkness: challengerRecord.darkness,
        scope: challengerRecord.scope,
        complexity: challengerRecord.complexity,
      },
      favoriteBooks: challengerRecord.favoriteBooks as any,
      kryptoniteBook: (challengerRecord.kryptoniteBook as any) ?? null,
      likedGenres: challengerRecord.likedGenres,
      dislikedGenres: challengerRecord.dislikedGenres,
      favoriteAuthors: challengerRecord.favoriteAuthors,
      theme: challengerRecord.theme as "dark" | "craft",
    };
  } else if (input.challengerDna) {
    challengerProfile = input.challengerDna;
  } else {
    throw new NotFoundError("Данные читателя для дуэли не предоставлены");
  }

  const targetProfile: ReadingDnaInput = {
    axes: {
      storyFocus: target.storyFocus,
      emotionalWeight: target.emotionalWeight,
      pace: target.pace,
      darkness: target.darkness,
      scope: target.scope,
      complexity: target.complexity,
    },
    favoriteBooks: target.favoriteBooks as any,
    kryptoniteBook: (target.kryptoniteBook as any) ?? null,
    likedGenres: target.likedGenres,
    dislikedGenres: target.dislikedGenres,
    favoriteAuthors: target.favoriteAuthors,
    theme: target.theme as "dark" | "craft",
  };

  const result = calculateCompatibility(targetProfile, challengerProfile);

  // Если между этими двумя билетами уже есть запись дуэли — обновляем её (предотвращаем дублирование)
  const existingDuel = challengerDnaId
    ? await prisma.readingDnaDuel.findFirst({
        where: {
          OR: [
            { targetDnaId: target.id, challengerDnaId },
            { targetDnaId: challengerDnaId, challengerDnaId: target.id },
          ],
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  if (existingDuel) {
    await prisma.readingDnaDuel.update({
      where: { id: existingDuel.id },
      data: {
        compatibility: result.compatibility,
        verdict: result.verdict,
        breakdown: result.breakdown as any,
        createdAt: new Date(),
      },
    });
  } else {
    // Фиксируем новую уникальную дуэль в базе данных
    await prisma.readingDnaDuel.create({
      data: {
        targetDnaId: target.id,
        challengerDnaId,
        challengerName: input.challengerName ?? null,
        compatibility: result.compatibility,
        verdict: result.verdict,
        breakdown: result.breakdown as any,
      },
    });

    // Инкрементируем счетчик дуэлей только при создании новой дуэли
    await prisma.readingDna.update({
      where: { id: target.id },
      data: { duelsCount: { increment: 1 } },
    });

    if (challengerDnaId) {
      await prisma.readingDna.update({
        where: { id: challengerDnaId },
        data: { duelsCount: { increment: 1 } },
      });
    }
  }

  return {
    ...result,
    targetTicketNumber: target.ticketNumber,
  };
}

export const TWINS_AXIS_WINDOW = 30;

export interface ReadingDnaTwinProfile {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export interface ReadingDnaTwinTierList {
  id: string;
  slug: string | null;
  title: string;
}

export type ReadingDnaTwinResult = ReadingDnaResponse & {
  similarity: number;
  user: ReadingDnaTwinProfile | null;
  topTierList: ReadingDnaTwinTierList | null;
  publicTierListsCount: number;
};

/**
 * Поиск книжных близнецов (Nearest-neighbour по осям восприятия с расчетом совместимости).
 */
export async function findTwins(
  ticketNumber: string,
  limit = 5
): Promise<ReadingDnaTwinResult[]> {
  const current = await prisma.readingDna.findUnique({
    where: { ticketNumber },
  });

  if (!current) return [];

  const clampWindow = (val: number) => ({
    gte: Math.max(0, val - TWINS_AXIS_WINDOW),
    lte: Math.min(100, val + TWINS_AXIS_WINDOW),
  });

  const candidates = await prisma.readingDna.findMany({
    where: {
      isPublic: true,
      id: { not: current.id },
      storyFocus: clampWindow(current.storyFocus),
      emotionalWeight: clampWindow(current.emotionalWeight),
      pace: clampWindow(current.pace),
      darkness: clampWindow(current.darkness),
      scope: clampWindow(current.scope),
      complexity: clampWindow(current.complexity),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          tierLists: {
            where: { isPublic: true },
            orderBy: { likesCount: "desc" },
            take: 3,
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
        },
      },
    },
    take: 50,
  });

  const currentProfile: ReadingDnaInput = {
    axes: {
      storyFocus: current.storyFocus,
      emotionalWeight: current.emotionalWeight,
      pace: current.pace,
      darkness: current.darkness,
      scope: current.scope,
      complexity: current.complexity,
    },
    favoriteBooks: current.favoriteBooks as any,
    kryptoniteBook: (current.kryptoniteBook as any) ?? null,
    likedGenres: current.likedGenres,
    dislikedGenres: current.dislikedGenres,
    favoriteAuthors: current.favoriteAuthors,
    theme: current.theme as "dark" | "craft",
  };

  const scored: ReadingDnaTwinResult[] = candidates.map((cand: any) => {
    const candProfile: ReadingDnaInput = {
      axes: {
        storyFocus: cand.storyFocus,
        emotionalWeight: cand.emotionalWeight,
        pace: cand.pace,
        darkness: cand.darkness,
        scope: cand.scope,
        complexity: cand.complexity,
      },
      favoriteBooks: cand.favoriteBooks as any,
      kryptoniteBook: (cand.kryptoniteBook as any) ?? null,
      likedGenres: cand.likedGenres,
      dislikedGenres: cand.dislikedGenres,
      favoriteAuthors: cand.favoriteAuthors,
      theme: cand.theme as "dark" | "craft",
    };

    const res = calculateCompatibility(currentProfile, candProfile);
    const tierLists: ReadingDnaTwinTierList[] = Array.isArray(cand.user?.tierLists)
      ? cand.user.tierLists
      : [];

    return {
      ...toResponse(cand),
      similarity: res.compatibility,
      user: cand.user
        ? {
            id: cand.user.id,
            username: cand.user.username,
            avatarUrl: cand.user.avatarUrl ?? null,
          }
        : null,
      topTierList: tierLists[0] ?? null,
      publicTierListsCount: tierLists.length,
    };
  });

  scored.sort((x, y) => y.similarity - x.similarity);
  return scored.slice(0, limit);
}

/**
 * Возвращает полный каталог читательских архетипов (единый источник правды).
 */
export function getArchetypeCatalog(): ArchetypeCatalogItem[] {
  return ARCHETYPES;
}

export interface TicketDuelEntry {
  id: number;
  direction: "incoming" | "outgoing";
  opponentName: string;
  opponentTicketNumber: string | null;
  opponentArchetypeName: string | null;
  compatibility: number;
  verdict: string | null;
  kryptoniteConflict: boolean;
  createdAt: Date;
}

export interface TicketDuelsSummary {
  totalDuels: number;
  bestMatch: TicketDuelEntry | null;
  mainAntagonist: TicketDuelEntry | null;
  recentDuels: TicketDuelEntry[];
}

function mapDuelRecord(
  duel: {
    id: number;
    targetDnaId: number;
    challengerDnaId: number | null;
    challengerName: string | null;
    compatibility: number;
    verdict: string | null;
    breakdown: unknown;
    createdAt: Date;
    challengerDna?: {
      ticketNumber: string;
      customName: string | null;
      archetypeName: string;
    } | null;
    targetDna?: {
      ticketNumber: string;
      customName: string | null;
      archetypeName: string;
    } | null;
  },
  currentTicketId: number
): TicketDuelEntry {
  const isIncoming = duel.targetDnaId === currentTicketId;
  const breakdownObj =
    duel.breakdown && typeof duel.breakdown === "object"
      ? (duel.breakdown as { kryptoniteConflict?: boolean })
      : null;

  if (isIncoming) {
    return {
      id: duel.id,
      direction: "incoming",
      opponentName:
        duel.challengerDna?.customName?.trim() ||
        duel.challengerName?.trim() ||
        "Читатель",
      opponentTicketNumber: duel.challengerDna?.ticketNumber ?? null,
      opponentArchetypeName: duel.challengerDna?.archetypeName ?? null,
      compatibility: duel.compatibility,
      verdict: duel.verdict,
      kryptoniteConflict: Boolean(breakdownObj?.kryptoniteConflict),
      createdAt: duel.createdAt,
    };
  }

  return {
    id: duel.id,
    direction: "outgoing",
    opponentName: duel.targetDna?.customName?.trim() || "Читатель",
    opponentTicketNumber: duel.targetDna?.ticketNumber ?? null,
    opponentArchetypeName: duel.targetDna?.archetypeName ?? null,
    compatibility: duel.compatibility,
    verdict: duel.verdict,
    kryptoniteConflict: Boolean(breakdownObj?.kryptoniteConflict),
    createdAt: duel.createdAt,
  };
}

/**
 * Журнал литературных дуэлей билета (входящие и исходящие сравнения):
 * общее количество, лучшее совпадение, главный антагонист и последние сравнения.
 */
export async function getTicketDuels(
  ticketNumberOrCode: string,
  limit = 10
): Promise<TicketDuelsSummary | null> {
  const ticket = await prisma.readingDna.findFirst({
    where: {
      OR: [
        { ticketNumber: ticketNumberOrCode },
        { shortCode: ticketNumberOrCode },
      ],
    },
    select: { id: true },
  });

  if (!ticket) return null;

  const participantSelect = {
    challengerDna: {
      select: {
        ticketNumber: true,
        customName: true,
        archetypeName: true,
      },
    },
    targetDna: {
      select: {
        ticketNumber: true,
        customName: true,
        archetypeName: true,
      },
    },
  };

  const duelCondition = {
    OR: [{ targetDnaId: ticket.id }, { challengerDnaId: ticket.id }],
  };

  const [totalDuels, recentRows, bestRow, worstRow] = await Promise.all([
    prisma.readingDnaDuel.count({ where: duelCondition }),
    prisma.readingDnaDuel.findMany({
      where: duelCondition,
      orderBy: { createdAt: "desc" },
      take: Math.max(limit * 3, 20),
      include: participantSelect,
    }),
    prisma.readingDnaDuel.findFirst({
      where: duelCondition,
      orderBy: [{ compatibility: "desc" }, { createdAt: "desc" }],
      include: participantSelect,
    }),
    prisma.readingDnaDuel.findFirst({
      where: duelCondition,
      orderBy: [{ compatibility: "asc" }, { createdAt: "desc" }],
      include: participantSelect,
    }),
  ]);

  const bestMatch = bestRow ? mapDuelRecord(bestRow, ticket.id) : null;
  const mainAntagonist =
    worstRow && bestRow && worstRow.id !== bestRow.id
      ? mapDuelRecord(worstRow, ticket.id)
      : null;

  // Дедуплицируем дуэли по оппоненту (оставляем только самое свежее сравнение с каждым читателем)
  const seenOpponents = new Set<string>();
  const uniqueRecentDuels: TicketDuelEntry[] = [];

  for (const row of recentRows) {
    const entry = mapDuelRecord(row, ticket.id);
    const key = entry.opponentTicketNumber
      ? entry.opponentTicketNumber.toUpperCase()
      : `anon-${entry.id}`;

    if (!seenOpponents.has(key)) {
      seenOpponents.add(key);
      uniqueRecentDuels.push(entry);
      if (uniqueRecentDuels.length >= limit) break;
    }
  }

  return {
    totalDuels,
    bestMatch,
    mainAntagonist,
    recentDuels: uniqueRecentDuels,
  };
}

export interface ArchetypeStatsResult {
  totalTickets: number;
  distribution: Record<string, { count: number; percent: number }>;
}

const STATS_CACHE_TTL_MS = 60_000;
let statsCache: { data: ArchetypeStatsResult; expiresAt: number } | null = null;

/**
 * Сбрасывает кэш статистики архетипов (для тестов).
 */
export function clearArchetypeStatsCache(): void {
  statsCache = null;
}

/**
 * Реальное распределение архетипов по базе данных (с кэшем на 60 секунд).
 */
export async function getArchetypeStats(): Promise<ArchetypeStatsResult> {
  const now = Date.now();
  if (statsCache && statsCache.expiresAt > now) {
    return statsCache.data;
  }

  const rows = await prisma.readingDna.groupBy({
    by: ["archetype"],
    _count: { _all: true },
  });

  const totalTickets = rows.reduce((sum, r) => sum + r._count._all, 0);
  const distribution: Record<string, { count: number; percent: number }> = {};

  if (totalTickets > 0) {
    for (const row of rows) {
      const count = row._count._all;
      const percent = Math.round((count / totalTickets) * 1000) / 10;
      distribution[row.archetype] = { count, percent };
    }
  }

  const data: ArchetypeStatsResult = { totalTickets, distribution };
  statsCache = { data, expiresAt: now + STATS_CACHE_TTL_MS };
  return data;
}

