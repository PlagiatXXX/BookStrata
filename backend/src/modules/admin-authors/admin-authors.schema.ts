// backend/src/modules/admin-authors/admin-authors.schema.ts
// Zod-схема входа для PUT /api/admin/authors/:id/content
import { z } from "zod";

/** Пустая строка → null (фронт шлёт "" при очистке поля) */
const nullableText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().max(max).nullable(),
  );

export const authorContentInputSchema = z.object({
  heroImageUrl: nullableText(1000).default(null),
  badge: nullableText(200).default(null),
  motto: nullableText(500).default(null),
  manifestoQuote: nullableText(2000).default(null),
  manifestoAuthor: nullableText(200).default(null),
  manifestoRole: nullableText(200).default(null),
  aboutText: nullableText(20000).default(null),
  stats: z
    .array(z.object({
      value: z.string().min(1).max(50),
      label: z.string().min(1).max(100),
    }))
    .max(8)
    .default([]),
  showcase: z
    .array(z.object({
      bookId: z.number().int().positive(),
      pullQuote: nullableText(500).default(null),
    }))
    .max(4)
    .superRefine((items, ctx) => {
      const seen = new Set<number>();
      items.forEach((item, index) => {
        if (seen.has(item.bookId)) {
          ctx.addIssue({
            code: "custom",
            message: `Книга ${item.bookId} повторяется в showcase`,
            path: [index, "bookId"],
          });
        }
        seen.add(item.bookId);
      });
    })
    .default([]),
  adaptations: z
    .array(z.object({
      kind: z.enum(["film", "theatre", "tv"]),
      title: z.string().min(1).max(300),
      meta: nullableText(300).default(null),
      description: nullableText(2000).default(null),
      url: nullableText(500).default(null),
    }))
    .max(20)
    .default([]),
  pressQuotes: z
    .array(z.object({
      quote: z.string().min(1).max(1000),
      source: z.string().min(1).max(200),
      sourceRole: nullableText(200).default(null),
    }))
    .max(20)
    .default([]),
});

export type AuthorContentInput = z.infer<typeof authorContentInputSchema>;
