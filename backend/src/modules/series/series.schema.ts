import { z } from "zod";
import { slugify } from "../../lib/slug.js";

export const createSeriesSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Название цикла обязательно")
    .max(200, "Название цикла не должно превышать 200 символов"),
  description: z
    .string()
    .trim()
    .max(5000, "Описание не должно превышать 5000 символов")
    .nullable()
    .optional(),
  coverImageUrl: z
    .string()
    .trim()
    .max(2000, "URL обложки слишком длинный")
    .nullable()
    .optional(),
  authorId: z.number().int().positive().nullable().optional(),
});

export const updateSeriesSchema = createSeriesSchema.partial();

export const listSeriesQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  authorId: z.coerce.number().int().positive().optional(),
});

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;
export type ListSeriesQuery = z.infer<typeof listSeriesQuerySchema>;

export function slugifySeriesName(name: string): string {
  const base = slugify(name);
  return base || "series";
}
