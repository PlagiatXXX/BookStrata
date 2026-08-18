import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { Prisma } from "@prisma/client";
import {
  createCelebritySchema,
  updateCelebritySchema,
  type CreateCelebrityInput,
  type UpdateCelebrityInput,
} from "./celebrity.schema.js";
import {
  migrateBookCovers,
  migrateUrlToCdn,
} from "../../lib/external-covers.js";
import {
  syncCatalogCards,
  gcOrphanBooks,
} from "../books/bookCatalogSync.service.js";
import { validateRemoteImageDimensions } from "../../lib/validators.js";
import { deleteIfOrphaned } from "../../lib/storage/file-cleanup.js";

function slugify(text: string): string {
  const cyrillicToLatin: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
    и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  let slug = text
    .toLowerCase()
    .trim()
    .split("")
    .map((char) => cyrillicToLatin[char] || char)
    .join("")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (!slug) slug = `celebrity-${randomSuffix}`;
  slug = `${slug}-${randomSuffix}`;
  return slug;
}

type JsonValue = Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
function toJsonValue<T>(value: T | null | undefined): JsonValue {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function validateCreateInput(input: unknown) {
  return createCelebritySchema.parse(input);
}

export async function validateUpdateInput(input: unknown) {
  return updateCelebritySchema.parse(input);
}

export async function getCelebrities(options?: {
  category?: string;
  isPublished?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const skip = (page - 1) * pageSize;

  const where: Prisma.CelebrityWhereInput = {};
  if (options?.category) where.category = options.category;
  if (options?.isPublished !== undefined) where.isPublished = options.isPublished;

  const [data, total] = await Promise.all([
    prisma.celebrity.findMany({
      where,
      orderBy: { order: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.celebrity.count({ where }),
  ]);

  return {
    data,
    meta: {
      totalItems: total,
      itemCount: data.length,
      itemsPerPage: pageSize,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
    },
  };
}

export async function getCelebrityBySlug(slug: string) {
  return prisma.celebrity.findUnique({ where: { slug } });
}

export async function getCelebrityById(id: number) {
  return prisma.celebrity.findUnique({ where: { id } });
}

export async function createCelebrity(input: CreateCelebrityInput) {
  const slug = slugify(input.name);

  // Фото должно быть не меньше минимума (иначе мылится на сайте)
  if (input.photoUrl) {
    const photoError = await validateRemoteImageDimensions(input.photoUrl);
    if (photoError) throw new ValidationError(photoError);
  }

  // Внешние обложки переводим на свой CDN (WebP через image-proxy)
  const [photoUrl, books] = await Promise.all([
    input.photoUrl ? migrateUrlToCdn(input.photoUrl) : Promise.resolve(""),
    input.books ? migrateBookCovers(input.books) : Promise.resolve(undefined),
  ]);

  const created = await prisma.celebrity.create({
    data: {
      slug,
      name: input.name,
      photoUrl,
      biography: input.biography || null,
      category: input.category || "",
      isPublished: input.isPublished ?? false,
      order: input.order ?? 0,
      tags: input.tags || [],
      tiers: toJsonValue(input.tiers),
      tierOrder: input.tierOrder || [],
      books: toJsonValue(books),
      unrankedBookIds: input.unrankedBookIds || [],
    },
  });

  // Рантайм-синхронизация карточек с каталогом (Фаза 2.2, seobook.md)
  if (input.books) {
    await syncCatalogCards("celebrity", created.id, input.books);
  }

  return created;
}

export async function updateCelebrity(id: number, input: UpdateCelebrityInput) {
  const data: Prisma.CelebrityUpdateInput = {};
  let oldPhoto: string | undefined;

  // Внешние обложки переводим на свой CDN (WebP через image-proxy)
  if (input.photoUrl !== undefined) {
    // Проверяем только при смене URL — старые записи с мелким фото
    // можно редактировать без замены картинки
    const current = await prisma.celebrity.findUnique({
      where: { id },
      select: { photoUrl: true },
    });
    oldPhoto = current?.photoUrl ?? undefined;
    if (input.photoUrl.trim() !== (current?.photoUrl ?? "")) {
      const photoError = await validateRemoteImageDimensions(input.photoUrl || "");
      if (photoError) throw new ValidationError(photoError);
    }
    data.photoUrl = await migrateUrlToCdn(input.photoUrl || "");
  }
  if (input.books !== undefined) {
    data.books = toJsonValue(await migrateBookCovers(input.books));
  }

  if (input.name !== undefined) data.name = input.name;
  if (input.biography !== undefined) data.biography = input.biography || null;
  if (input.category !== undefined) data.category = input.category || "";
  if (input.isPublished !== undefined) data.isPublished = input.isPublished;
  if (input.order !== undefined) data.order = input.order;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.tiers !== undefined) data.tiers = toJsonValue(input.tiers);
  if (input.tierOrder !== undefined) data.tierOrder = input.tierOrder;
  if (input.unrankedBookIds !== undefined) data.unrankedBookIds = input.unrankedBookIds;

  const updated = await prisma.celebrity.update({
    where: { id },
    data,
  });

  // Старое фото осиротело (если было нашим) — чистим
  if (data.photoUrl !== undefined) {
    await deleteIfOrphaned(oldPhoto);
  }

  // Рантайм-синхронизация карточек с каталогом (Фаза 2.2, seobook.md)
  if (input.books !== undefined) {
    await syncCatalogCards("celebrity", id, input.books);
  }

  return updated;
}

export async function deleteCelebrity(id: number) {
  // Собираем книги до удаления: каскад чистит CelebrityBook,
  // осиротевшие книги убираем GC (Фаза 2.2, seobook.md)
  const links = await prisma.celebrityBook.findMany({
    where: { celebrityId: id },
    select: { bookId: true },
  });
  const celebrity = await prisma.celebrity.findUnique({
    where: { id },
    select: { photoUrl: true },
  });
  await prisma.celebrity.delete({ where: { id } });
  await gcOrphanBooks(links.map((l) => l.bookId));
  // Фото удалённой знаменитости осиротело (если было нашим) — чистим
  await deleteIfOrphaned(celebrity?.photoUrl);
}

export async function togglePublish(id: number) {
  const celebrity = await prisma.celebrity.findUnique({ where: { id } });
  if (!celebrity) throw new NotFoundError("Celebrity not found");

  return prisma.celebrity.update({
    where: { id },
    data: { isPublished: !celebrity.isPublished },
  });
}
