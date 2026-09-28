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
});

export const authorPageSchema = z.object({
  author: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    seoDescription: z.string(),
    bookCount: z.number(),
    avgRating: z.number().nullable(),
  }),
  books: z.array(authorBookSchema),
  topBooks: z.array(authorBookSchema),
  bottomBooks: z.array(authorBookSchema),
  tierLists: z.array(
    z.object({
      id: z.string(),
      slug: z.string().nullable(),
      title: z.string(),
    }),
  ),
});

export type AuthorBookDto = z.infer<typeof authorBookSchema>;
export type AuthorPageData = z.infer<typeof authorPageSchema>;
