// backend/src/modules/tier-lists/tierList.schema.ts
import { z } from 'zod';

// --- Zod Схемы для типизации TypeScript (используются как z.infer<typeof>) ---
export const getTierListsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  pageSize: z.string().optional().default('10'),
  sortBy: z.enum(['updatedAt', 'updated_at', 'likes', 'created', 'created_at']).optional().default('updatedAt'),
});

export const createTierListBodySchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export const togglePublicBodySchema = z.object({
  isPublic: z.boolean(),
});

// --- JSON Schema для Swagger документации ---
export const getTierListsSchema = {
  description: 'Get paginated list of tier lists for authenticated user',
  tags: ['Tier Lists'],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', default: '1' },
      pageSize: { type: 'string', default: '6' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        tierLists: { type: 'array' },
        total: { type: 'number' },
      },
    },
  },
};

export const createTierListSchema = {
  description: 'Create a new tier list',
  tags: ['Tier Lists'],
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string' },
    },
  },
  response: {
    201: { type: 'object' },
  },
};

export const getTierListByIdSchema = {
  description: 'Get a specific tier list by ID',
  tags: ['Tier Lists'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
};

export const updateTierListSchema = {
  description: 'Update tier list title',
  tags: ['Tier Lists'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string' },
    },
  },
};

export const deleteTierListSchema = {
  description: 'Delete a tier list',
  tags: ['Tier Lists'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
};

export const updatePlacementsSchema = {
  description: 'Update book placements in tier list',
  tags: ['Tier Lists'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['placements'],
    properties: {
      placements: {
        type: 'array',
        items: {
          type: 'object',
          required: ['bookId', 'tierId', 'rank'],
          properties: {
            bookId: { type: 'number' },
            tierId: { type: ['number', 'null'] },
            rank: { type: 'number' },
          },
        },
      },
    },
  },
};

export const saveTiersSchema = {
  description: 'Save tier definitions',
  tags: ['Tier Lists'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['tiers'],
    properties: {
      tiers: {
        type: 'array',
        items: {
          type: 'object',
          required: ['title', 'color', 'rank'],
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            color: { type: 'string' },
            rank: { type: 'number' },
          },
        },
      },
    },
  },
};

export const addBooksSchema = {
  description: 'Add books to tier list',
  tags: ['Tier Lists'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['books'],
    properties: {
      books: {
        type: 'array',
        items: {
          type: 'object',
          required: ['title', 'coverImageUrl'],
          properties: {
            title: { type: 'string' },
            author: { type: ['string', 'null'] },
            coverImageUrl: { type: 'string' },
            description: { type: ['string', 'null'] },
            thoughts: { type: ['string', 'null'] },
          },
        },
      },
    },
  },
};

export const updateBookSchema = {
  description: 'Update book information',
  tags: ['Tier Lists'],
  params: {
    type: 'object',
    required: ['id', 'bookId'],
    properties: {
      id: { type: 'string' },
      bookId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      author: { type: 'string' },
      description: { type: 'string' },
      thoughts: { type: 'string' },
    },
  },
};

export const deleteBookSchema = {
  description: 'Delete a book from tier list',
  tags: ['Tier Lists'],
  params: {
    type: 'object',
    required: ['id', 'bookId'],
    properties: {
      id: { type: 'string' },
      bookId: { type: 'string' },
    },
  },
};

export const togglePublicSchema = {
  description: 'Toggle tier list public/private status',
  tags: ['Tier Lists'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['isPublic'],
    properties: {
      isPublic: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        isPublic: { type: 'boolean' },
      },
    },
  },
};

export const getPublicTierListsSchema = {
  description: 'Get public tier lists (for template library)',
  tags: ['Tier Lists'],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', default: '1' },
      pageSize: { type: 'string', default: '10' },
      sortBy: { type: 'string', enum: ['updatedAt', 'updated_at', 'likes', 'created', 'created_at'], default: 'updatedAt' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              isPublic: { type: 'boolean' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  username: { type: 'string' },
                  avatarUrl: { type: 'string' },
                },
              },
              likesCount: { type: 'number' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            totalItems: { type: 'number' },
            itemCount: { type: 'number' },
            itemsPerPage: { type: 'number' },
            totalPages: { type: 'number' },
            currentPage: { type: 'number' },
          },
        },
      },
    },
  },
};

// --- Экспортируем типы для обработчиков ---
export type GetTierListsQuery = z.infer<typeof getTierListsQuerySchema>;
export type CreateTierListBody = z.infer<typeof createTierListBodySchema>;
export type TogglePublicBody = z.infer<typeof togglePublicBodySchema>;
