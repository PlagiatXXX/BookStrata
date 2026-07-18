import { z } from "zod";

// --- Zod схемы для валидации ---

const tierObjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  bookIds: z.array(z.string()).optional().default([]),
});

const bookObjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().nullable().optional(),
  coverImageUrl: z.string(),
  description: z.string().nullable().optional(),
  thoughts: z.string().nullable().optional(),
  genre: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  rating: z.number().optional(),
});

export const createCelebritySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  photoUrl: z.string().optional().default(""),
  biography: z.string().optional(),
  category: z.string().optional().default(""),
  isPublished: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0),
  // Tier list data
  tiers: z.record(z.string(), tierObjectSchema).optional(),
  tierOrder: z.array(z.string()).optional(),
  books: z.record(z.string(), bookObjectSchema).optional(),
  unrankedBookIds: z.array(z.string()).optional(),
});

export const updateCelebritySchema = createCelebritySchema.partial();

export type CreateCelebrityInput = z.infer<typeof createCelebritySchema>;
export type UpdateCelebrityInput = z.infer<typeof updateCelebritySchema>;
