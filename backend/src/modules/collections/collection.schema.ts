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

export const createCollectionSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  type: z.enum(["curated", "literary"]),
  content: z.string().optional(),
  excerpt: z.string().max(300).optional(),
  coverImageUrl: z.string().optional().default(""),
  bookCovers: z.array(z.string()).optional().default([]),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  isPublished: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0),
  accentColor: z.string().optional(),
  editorialNote: z.string().nullable().optional(),
  // Curated fields
  tiers: z.record(z.string(), tierObjectSchema).optional(),
  tierOrder: z.array(z.string()).optional(),
  books: z.record(z.string(), bookObjectSchema).optional(),
  unrankedBookIds: z.array(z.string()).optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

// --- JSON схемы для Swagger ---

export const createCollectionJsonSchema = {
  description: "Create a new collection",
  tags: ["Collections"],
  body: {
    type: "object",
    required: ["title", "type"],
    properties: {
      title: { type: "string", maxLength: 255 },
      type: { type: "string", enum: ["curated", "literary"] },
      content: { type: "string" },
      excerpt: { type: "string", maxLength: 300 },
      coverImageUrl: { type: "string" },
      categoryId: { type: "string" },
      bookCovers: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
      isPublished: { type: "boolean" },
      order: { type: "integer" },
    },
  },
  response: {
    201: { type: "object", properties: { id: { type: "integer" }, slug: { type: "string" } } },
  },
};

export const getCollectionsJsonSchema = {
  description: "Get all collections (published or all for admin)",
  tags: ["Collections"],
  querystring: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["curated", "literary"] },
      categoryId: { type: "string" },
      isPublished: { type: "string" },
      page: { type: "string", default: "1" },
      pageSize: { type: "string", default: "50" },
    },
  },
};

export const getCollectionBySlugJsonSchema = {
  description: "Get a collection by slug",
  tags: ["Collections"],
  params: {
    type: "object",
    required: ["slug"],
    properties: {
      slug: { type: "string" },
    },
  },
};

export const updateCollectionJsonSchema = {
  description: "Update a collection",
  tags: ["Collections"],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "integer" },
    },
  },
};

export const parseUrlSchema = z.object({
  url: z.string().url("Некорректный URL"),
});

export type ParseUrlInput = z.infer<typeof parseUrlSchema>;

export const deleteCollectionJsonSchema = {
  description: "Delete a collection",
  tags: ["Collections"],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "integer" },
    },
  },
};
