import { z } from "zod";

/** Статусы книги в «Моей полке» */
export const shelfStatusSchema = z.enum(["read", "want_to_read"]);
export type ShelfStatus = z.infer<typeof shelfStatusSchema>;

// Используется только для вывода типов (SetShelfStatusBody) — body валидируется JSON Schema ниже
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const setStatusBodySchema = z.object({
  status: shelfStatusSchema,
  // Данные книги для find-or-create: нужны, когда bookId не число
  // (книги коллекций имеют строковые id и не существуют в таблице Book)
  book: z
    .object({
      title: z.string().min(1).max(500),
      author: z.string().max(300).optional(),
      coverImageUrl: z.string().max(500).optional(),
      genre: z.string().max(200).optional(),
      description: z.string().max(5000).optional(),
    })
    .optional(),
});

// Используется только для вывода типов (ShelfImportBody) — body валидируется JSON Schema ниже
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const importBodySchema = z.object({
  items: z
    .array(
      z.object({
        bookKey: z.string().min(1).max(300),
        status: shelfStatusSchema,
        book: z
          .object({
            title: z.string().min(1).max(500),
            author: z.string().max(300).optional(),
            coverImageUrl: z.string().max(500).optional(),
            genre: z.string().max(200).optional(),
            description: z.string().max(5000).optional(),
          })
          .optional(),
      }),
    )
    .max(1000, "Слишком много книг в полке"),
});

// Используется только для вывода типов (ShelfRemoveBooksBody) — body валидируется JSON Schema ниже
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const removeBooksBodySchema = z.object({
  bookKeys: z.array(z.string().min(1).max(300)).max(1000),
});

/**
 * ВАЖНО: в этой версии zod-to-json-schema возвращает пустую обёртку
 * для не-именованных схем, поэтому body-схемы пишем вручную (JSON Schema),
 * как это сделано в ratings.route.ts.
 */
export const setShelfStatusSchema = {
  description: "Установить статус книги в «Моей полке» (upsert)",
  tags: ["Shelf"],
  body: {
    type: "object",
    required: ["status"],
    properties: {
      status: { type: "string", enum: ["read", "want_to_read"] },
      book: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 500 },
          author: { type: "string", maxLength: 300 },
          coverImageUrl: { type: "string", maxLength: 500 },
          genre: { type: "string", maxLength: 200 },
          description: { type: "string", maxLength: 5000 },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
} as const;

export const importShelfSchema = {
  description: "Импортировать гостевую полку в аккаунт (merge по bookKey)",
  tags: ["Shelf"],
  body: {
    type: "object",
    required: ["items"],
    properties: {
      items: {
        type: "array",
        maxItems: 1000,
        items: {
          type: "object",
          required: ["bookKey", "status"],
          properties: {
            bookKey: { type: "string", minLength: 1, maxLength: 300 },
            status: { type: "string", enum: ["read", "want_to_read"] },
            book: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 1, maxLength: 500 },
                author: { type: "string", maxLength: 300 },
                coverImageUrl: { type: "string", maxLength: 500 },
                genre: { type: "string", maxLength: 200 },
                description: { type: "string", maxLength: 5000 },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
} as const;

export const removeShelfBooksSchema = {
  description: "Снять отметки с набора книг (секция полки или вся полка)",
  tags: ["Shelf"],
  body: {
    type: "object",
    required: ["bookKeys"],
    properties: {
      bookKeys: {
        type: "array",
        maxItems: 1000,
        items: { type: "string", minLength: 1, maxLength: 300 },
      },
    },
    additionalProperties: false,
  },
} as const;

export type SetShelfStatusBody = z.infer<typeof setStatusBodySchema>;
export type ShelfImportBody = z.infer<typeof importBodySchema>;
export type ShelfRemoveBooksBody = z.infer<typeof removeBooksBodySchema>;