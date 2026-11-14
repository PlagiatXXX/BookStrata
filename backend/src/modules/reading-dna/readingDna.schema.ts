import { z } from "zod";

/**
 * Валидация числовой шкалы восприятия (0..100).
 */
const axisValue = z.number().min(0).max(100);

/**
 * 6 непрерывных психометрических осей восприятия Reading DNA.
 */
export const dnaAxesSchema = z.object({
  storyFocus: axisValue,
  emotionalWeight: axisValue,
  pace: axisValue,
  darkness: axisValue,
  scope: axisValue,
  complexity: axisValue,
});

export type DnaAxes = z.infer<typeof dnaAxesSchema>;

/**
 * Книга в профиле ДНК (Святыня или Криптонит).
 */
export const dnaBookItemSchema = z.object({
  title: z.string().min(1, "Название книги обязательно").max(200),
  author: z.string().max(200).optional(),
  bookId: z.number().int().positive().optional(),
  coverImageUrl: z.string().optional(),
});

export type DnaBookItem = z.infer<typeof dnaBookItemSchema>;

/**
 * Входные данные для создания / расчета Reading DNA.
 */
export const readingDnaInputSchema = z.object({
  axes: dnaAxesSchema,
  favoriteBooks: z
    .array(dnaBookItemSchema)
    .length(3, "Необходимо указать ровно 3 любимые книги"),
  kryptoniteBook: dnaBookItemSchema.nullable().optional(),
  likedGenres: z.array(z.string().max(100)).max(3).default([]),
  dislikedGenres: z.array(z.string().max(100)).max(3).default([]),
  favoriteAuthors: z.array(z.string().max(100)).max(5).default([]),
  customName: z.string().max(50).optional(),
  theme: z.enum(["dark", "craft"]).default("dark"),
  guestToken: z.string().max(100).optional(),
});

export type ReadingDnaInput = z.infer<typeof readingDnaInputSchema>;

/**
 * Входные данные для проведения дуэли вкусов.
 */
export const readingDnaDuelInputSchema = z
  .object({
    targetTicketNumber: z.string().min(1, "Номер билета цели обязателен"),
    challengerTicketNumber: z.string().optional(),
    challengerName: z.string().max(50).optional(),
    challengerDna: readingDnaInputSchema.optional(),
  })
  .refine(
    (data) => Boolean(data.challengerTicketNumber || data.challengerDna),
    {
      message:
        "Необходимо передать либо challengerTicketNumber, либо объект challengerDna",
    }
  );

export type ReadingDnaDuelInput = z.infer<typeof readingDnaDuelInputSchema>;

/**
 * Входные данные для фиксации шеринга билета.
 */
export const readingDnaShareInputSchema = z.object({
  ticketNumber: z.string().min(1, "Номер билета обязателен"),
});

export type ReadingDnaShareInput = z.infer<typeof readingDnaShareInputSchema>;

/**
 * Схема ответа публичного / сохраненного билета Reading DNA.
 */
export const readingDnaResponseSchema = z.object({
  id: z.number(),
  ticketNumber: z.string(),
  customName: z.string().nullable().optional(),
  archetype: z.string(),
  archetypeName: z.string(),
  archetypeDesc: z.string().nullable().optional(),
  motto: z.string().nullable().optional(),
  theme: z.string(),
  axes: dnaAxesSchema,
  favoriteBooks: z.array(dnaBookItemSchema),
  kryptoniteBook: dnaBookItemSchema.nullable().optional(),
  likedGenres: z.array(z.string()),
  dislikedGenres: z.array(z.string()),
  favoriteAuthors: z.array(z.string()),
  shareUrl: z.string().nullable().optional(),
  shortCode: z.string().nullable().optional(),
  qrCodeUrl: z.string().nullable().optional(),
  ticketImageUrl: z.string().nullable().optional(),
  viewsCount: z.number().default(0),
  shareCount: z.number().default(0),
  duelsCount: z.number().default(0),
  createdAt: z.union([z.string(), z.date()]),
});

export const axisRangeSchema = z.object({
  min: z.number().min(0).max(100),
  max: z.number().min(0).max(100),
});

export const casteInfoSchema = z.object({
  id: z.enum(["mind", "abyss", "action", "light"]),
  name: z.string(),
  sealColor: z.string(),
  badgeClass: z.string(),
});

export const archetypeCatalogItemSchema = z.object({
  id: z.string(),
  number: z.number(),
  caste: casteInfoSchema,
  rarity: z.number(),
  names: z.object({
    dark: z.string(),
    craft: z.string(),
  }),
  description: z.string(),
  quote: z.string(),
  specialSign: z.string(),
  axisRanges: z.object({
    storyFocus: axisRangeSchema,
    emotionalWeight: axisRangeSchema,
    pace: axisRangeSchema,
    darkness: axisRangeSchema,
    scope: axisRangeSchema,
    complexity: axisRangeSchema,
  }),
});

export type ArchetypeCatalogItem = z.infer<typeof archetypeCatalogItemSchema>;

export const dnaArchetypesResponseSchema = z.object({
  archetypes: z.array(archetypeCatalogItemSchema),
});


export type ReadingDnaResponse = z.infer<typeof readingDnaResponseSchema>;
