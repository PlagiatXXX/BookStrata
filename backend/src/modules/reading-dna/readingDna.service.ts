/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
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
 * Сохранение / обновление читательского ДНК.
 */
export async function saveDna(
  input: ReadingDnaInput,
  userId?: number
): Promise<ReadingDnaResponse> {
  const archetypeDef = resolveArchetype(input.axes);
  const archetypeName =
    input.theme === "craft" ? archetypeDef.names.craft : archetypeDef.names.dark;

  const favoriteBookIds = input.favoriteBooks
    .map((b) => b.bookId)
    .filter((id): id is number => typeof id === "number");

  const kryptoniteBookId = input.kryptoniteBook?.bookId ?? null;

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
    favoriteBooks: input.favoriteBooks as any,
    kryptoniteBook: input.kryptoniteBook ? (input.kryptoniteBook as any) : undefined,
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
      const updated = await prisma.readingDna.update({
        where: { id: existingUserTicket.id },
        data: basePayload,
      });
      return toResponse(updated);
    }
  } else if (input.guestToken) {
    const existingGuestTicket = await prisma.readingDna.findUnique({
      where: { guestToken: input.guestToken },
    });
    if (existingGuestTicket) {
      const updated = await prisma.readingDna.update({
        where: { id: existingGuestTicket.id },
        data: basePayload,
      });
      return toResponse(updated);
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

  // Фиксируем результат дуэли в базе данных
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

  // Инкрементируем счетчик сыгранных дуэлей у цели
  await prisma.readingDna.update({
    where: { id: target.id },
    data: { duelsCount: { increment: 1 } },
  });

  return {
    ...result,
    targetTicketNumber: target.ticketNumber,
  };
}

export const TWINS_AXIS_WINDOW = 30;

/**
 * Поиск книжных близнецов (Nearest-neighbour по осям восприятия с расчетом совместимости).
 */
export async function findTwins(
  ticketNumber: string,
  limit = 5
): Promise<Array<ReadingDnaResponse & { similarity: number }>> {
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

  const scored = candidates.map((cand) => {
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
    return {
      ...toResponse(cand),
      similarity: res.compatibility,
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

