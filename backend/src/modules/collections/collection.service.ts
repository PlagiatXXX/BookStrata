import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import {
  createCollectionSchema,
  updateCollectionSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "./collection.schema.js";

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
  if (!slug) slug = `collection-${randomSuffix}`;
  // Add random suffix to ensure uniqueness
  slug = `${slug}-${randomSuffix}`;
  return slug;
}

type JsonValue = Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
function toJsonValue<T>(value: T | null | undefined): JsonValue {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function validateCreateInput(input: unknown) {
  return createCollectionSchema.parse(input);
}

export async function validateUpdateInput(input: unknown) {
  return updateCollectionSchema.parse(input);
}

export async function getCollections(options?: {
  type?: string;
  categoryId?: string;
  isPublished?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const skip = (page - 1) * pageSize;

  const where: Prisma.CollectionWhereInput = {};
  if (options?.type) where.type = options.type;
  if (options?.categoryId) where.categoryId = options.categoryId;
  if (options?.isPublished !== undefined) where.isPublished = options.isPublished;

  const [data, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      orderBy: { order: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.collection.count({ where }),
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

export async function getCollectionBySlug(slug: string) {
  return prisma.collection.findUnique({ where: { slug } });
}

export async function getCollectionById(id: number) {
  return prisma.collection.findUnique({ where: { id } });
}

export async function createCollection(input: CreateCollectionInput) {
  const slug = slugify(input.title);

  return prisma.collection.create({
    data: {
      slug,
      title: input.title,
      type: input.type,
      content: input.content || null,
      excerpt: input.excerpt || null,
      categoryId: input.categoryId || null,
      coverImageUrl: input.coverImageUrl || "",
      bookCovers: input.bookCovers || [],
      tags: input.tags || [],
      isPublished: input.isPublished ?? false,
      order: input.order ?? 0,
      tiers: toJsonValue(input.tiers),
      tierOrder: input.tierOrder || [],
      books: toJsonValue(input.books),
      unrankedBookIds: input.unrankedBookIds || [],
    },
  });
}

export async function updateCollection(id: number, input: UpdateCollectionInput) {
  const data: Prisma.CollectionUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.type !== undefined) data.type = input.type;
  if (input.content !== undefined) data.content = input.content || null;
  if (input.excerpt !== undefined) data.excerpt = input.excerpt || null;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId || null;
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl || "";
  if (input.bookCovers !== undefined) data.bookCovers = input.bookCovers;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.isPublished !== undefined) data.isPublished = input.isPublished;
  if (input.order !== undefined) data.order = input.order;
  if (input.tiers !== undefined) data.tiers = toJsonValue(input.tiers);
  if (input.tierOrder !== undefined) data.tierOrder = input.tierOrder;
  if (input.books !== undefined) data.books = toJsonValue(input.books);
  if (input.unrankedBookIds !== undefined) data.unrankedBookIds = input.unrankedBookIds;

  return prisma.collection.update({
    where: { id },
    data,
  });
}

export async function deleteCollection(id: number) {
  return prisma.collection.delete({ where: { id } });
}

export async function togglePublish(id: number) {
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) throw new Error("Collection not found");

  return prisma.collection.update({
    where: { id },
    data: { isPublished: !collection.isPublished },
  });
}
