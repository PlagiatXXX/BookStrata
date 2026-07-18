import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import { Prisma } from "@prisma/client";
import {
  createCelebritySchema,
  updateCelebritySchema,
  type CreateCelebrityInput,
  type UpdateCelebrityInput,
} from "./celebrity.schema.js";

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

  return prisma.celebrity.create({
    data: {
      slug,
      name: input.name,
      photoUrl: input.photoUrl || "",
      biography: input.biography || null,
      category: input.category || "",
      isPublished: input.isPublished ?? false,
      order: input.order ?? 0,
      tiers: toJsonValue(input.tiers),
      tierOrder: input.tierOrder || [],
      books: toJsonValue(input.books),
      unrankedBookIds: input.unrankedBookIds || [],
    },
  });
}

export async function updateCelebrity(id: number, input: UpdateCelebrityInput) {
  const data: Prisma.CelebrityUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.photoUrl !== undefined) data.photoUrl = input.photoUrl || "";
  if (input.biography !== undefined) data.biography = input.biography || null;
  if (input.category !== undefined) data.category = input.category || "";
  if (input.isPublished !== undefined) data.isPublished = input.isPublished;
  if (input.order !== undefined) data.order = input.order;
  if (input.tiers !== undefined) data.tiers = toJsonValue(input.tiers);
  if (input.tierOrder !== undefined) data.tierOrder = input.tierOrder;
  if (input.books !== undefined) data.books = toJsonValue(input.books);
  if (input.unrankedBookIds !== undefined) data.unrankedBookIds = input.unrankedBookIds;

  return prisma.celebrity.update({
    where: { id },
    data,
  });
}

export async function deleteCelebrity(id: number) {
  return prisma.celebrity.delete({ where: { id } });
}

export async function togglePublish(id: number) {
  const celebrity = await prisma.celebrity.findUnique({ where: { id } });
  if (!celebrity) throw new NotFoundError("Celebrity not found");

  return prisma.celebrity.update({
    where: { id },
    data: { isPublished: !celebrity.isPublished },
  });
}
