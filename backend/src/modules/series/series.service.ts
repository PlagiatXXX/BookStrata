import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { isPrismaP2002 } from "../../lib/slug.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import {
  createSeriesSchema,
  updateSeriesSchema,
  slugifySeriesName,
  type CreateSeriesInput,
  type UpdateSeriesInput,
  type ListSeriesQuery,
} from "./series.schema.js";

const SERIES_AUTHOR_SELECT = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.AuthorSelect;

const SERIES_BOOK_SELECT = {
  id: true,
  slug: true,
  title: true,
  author: true,
  coverImageUrl: true,
  genre: true,
  rating: true,
  publishedYear: true,
  ageRating: true,
  seriesOrder: true,
} satisfies Prisma.BookSelect;

async function findAvailableSlug(baseName: string): Promise<string> {
  const slugBase = slugifySeriesName(baseName);
  for (let attempt = 1; attempt <= 20; attempt++) {
    const candidate = attempt === 1 ? slugBase : `${slugBase}-${attempt}`;
    const existing = await prisma.series.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;
}

async function assertAuthorExists(authorId: number | null | undefined) {
  if (authorId == null) return;
  const author = await prisma.author.findUnique({
    where: { id: authorId },
    select: { id: true },
  });
  if (!author) {
    throw new NotFoundError("Автор не найден");
  }
}

export async function createSeries(rawInput: CreateSeriesInput) {
  const input = createSeriesSchema.parse(rawInput);
  await assertAuthorExists(input.authorId);

  const normalizedDescription = input.description?.trim() || null;
  const normalizedCover = input.coverImageUrl?.trim() || null;

  for (let retry = 0; retry < 5; retry++) {
    const slug = await findAvailableSlug(input.name);
    try {
      return await prisma.series.create({
        data: {
          name: input.name,
          slug,
          description: normalizedDescription,
          coverImageUrl: normalizedCover,
          authorId: input.authorId ?? null,
        },
        include: {
          author: { select: SERIES_AUTHOR_SELECT },
          _count: { select: { books: true } },
        },
      });
    } catch (error) {
      if (isPrismaP2002(error) && retry < 4) {
        continue;
      }
      throw error;
    }
  }

  throw new ConflictError("Не удалось сгенерировать уникальный slug для цикла");
}

export async function findOrCreateSeriesByName(
  name: string,
  authorId?: number | null,
) {
  const trimmed = name.trim();
  const existing = await prisma.series.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    include: {
      author: { select: SERIES_AUTHOR_SELECT },
      _count: { select: { books: true } },
    },
  });
  if (existing) return existing;

  return createSeries({ name: trimmed, authorId: authorId ?? null });
}

export async function updateSeries(id: number, rawInput: UpdateSeriesInput) {
  const input = updateSeriesSchema.parse(rawInput);
  const existing = await prisma.series.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError("Цикл не найден");
  }

  if (input.authorId !== undefined) {
    await assertAuthorExists(input.authorId);
  }

  const data: Prisma.SeriesUncheckedUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.coverImageUrl !== undefined) {
    data.coverImageUrl = input.coverImageUrl?.trim() || null;
  }
  if (input.authorId !== undefined) {
    data.authorId = input.authorId;
  }

  // Slug намеренно не перегенерируем при редактировании названия,
  // чтобы не ломать проиндексированные URL (/series/:slug).
  return prisma.series.update({
    where: { id },
    data,
    include: {
      author: { select: SERIES_AUTHOR_SELECT },
      _count: { select: { books: true } },
    },
  });
}

export async function deleteSeries(id: number) {
  const existing = await prisma.series.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError("Цикл не найден");
  }

  const attachedBooksCount = await prisma.book.count({
    where: { seriesId: id },
  });
  if (attachedBooksCount > 0) {
    throw new ConflictError(
      `Нельзя удалить цикл: к нему привязано книг — ${attachedBooksCount}. Сначала отвяжите книги.`,
    );
  }

  await prisma.series.delete({ where: { id } });
  return { success: true };
}

export async function getSeriesBySlug(slug: string) {
  const series = await prisma.series.findUnique({
    where: { slug },
    include: {
      author: { select: SERIES_AUTHOR_SELECT },
      books: {
        where: {
          status: "published",
          userId: null,
          mergedIntoId: null,
        },
        orderBy: [
          { seriesOrder: { sort: "asc", nulls: "last" } },
          { publishedYear: { sort: "asc", nulls: "last" } },
          { id: "asc" },
        ],
        select: SERIES_BOOK_SELECT,
      },
    },
  });

  return series;
}

export async function listSeries(params: Partial<ListSeriesQuery> = {}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.SeriesWhereInput = {};
  if (params.q?.trim()) {
    where.name = { contains: params.q.trim(), mode: "insensitive" };
  }
  if (params.authorId != null) {
    where.authorId = params.authorId;
  }

  const [items, total] = await Promise.all([
    prisma.series.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ name: "asc" }],
      include: {
        author: { select: SERIES_AUTHOR_SELECT },
        _count: { select: { books: true } },
      },
    }),
    prisma.series.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
  };
}
