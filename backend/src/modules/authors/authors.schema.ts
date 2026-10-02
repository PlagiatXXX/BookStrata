// backend/src/modules/authors/authors.schema.ts
// Zod-схема данных страницы автора /api/authors/:slug
import { z } from "zod";

export const authorBookSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string().nullable(),
  coverImageUrl: z.string(),
  publishedYear: z.number().nullable(),
  genre: z.string().nullable(),
  rating: z.number().nullable(),
  ratingsCount: z.number(),
  isbn: z.string().nullable(),
  description: z.string().nullable(),
});

export const authorStatSchema = z.object({ value: z.string(), label: z.string() });

export const authorShowcaseSchema = z.object({
  book: authorBookSchema,
  pullQuote: z.string().nullable(),
});

export const authorAdaptationSchema = z.object({
  kind: z.enum(["film", "theatre", "tv"]),
  title: z.string(),
  meta: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
});

export const authorPressQuoteSchema = z.object({
  quote: z.string(),
  source: z.string(),
  sourceRole: z.string().nullable(),
});

export const authorPageSchema = z.object({
  author: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    seoDescription: z.string(),
    bookCount: z.number(),
    avgRating: z.number().nullable(),
    heroImageUrl: z.string().nullable(),
    badge: z.string().nullable(),
    motto: z.string().nullable(),
    manifestoQuote: z.string().nullable(),
    manifestoAuthor: z.string().nullable(),
    manifestoRole: z.string().nullable(),
    aboutText: z.string().nullable(),
  }),
  books: z.array(authorBookSchema),
  topBooks: z.array(authorBookSchema),
  bottomBooks: z.array(authorBookSchema),
  tierLists: z.array(z.object({ id: z.string(), slug: z.string().nullable(), title: z.string() })),
  stats: z.array(authorStatSchema),
  showcase: z.array(authorShowcaseSchema),
  adaptations: z.array(authorAdaptationSchema),
  pressQuotes: z.array(authorPressQuoteSchema),
});

export type AuthorBookDto = z.infer<typeof authorBookSchema>;
export type AuthorPageData = z.infer<typeof authorPageSchema>;
