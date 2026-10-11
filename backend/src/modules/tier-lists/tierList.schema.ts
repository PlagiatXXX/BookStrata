// backend/src/modules/tier-lists/tierList.schema.ts
import { z } from 'zod';

// --- Zod Схемы для типизации TypeScript (используются как z.infer<typeof>) ---
export const getTierListsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  pageSize: z.string().optional().default('10'),
  sortBy: z.enum(['updatedAt', 'updated_at', 'likes', 'created', 'created_at']).optional().default('updatedAt'),
});

export const createTierListBodySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
});

export const togglePublicBodySchema = z.object({
  isPublic: z.boolean(),
});

// --- JSON Schema для Swagger документации ---
// ВАЖНО: Fastify принимает схему только в ключе schema:{} роута (см. tierList.route.ts).
// Спред ...schema.getXSchema на верхний уровень опций молча игнорируется.
//
// response-блоки здесь сознательно ОТСУТСТВУЮТ у GET /, GET /liked, POST /, PUT /:id/public:
// реальные ответы содержат поля Prisma-объектов и пагинацию {data, meta, links}, а
// fast-json-stringify вырезает всё, что не объявлено в схеме (баг register в auth 11.10.2026:
// неполная схема → фронт получал {}). Объявлять схему надо только если она покрывает ответ ПОЛНОСТЬЮ.
export const getTierListsSchema = {
  description: 'Get paginated list of tier lists for authenticated user',
  tags: ['Tier Lists'],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', default: '1' },
      // default '10' — как в getTierListsQuerySchema и safePageParam фоллбэке сервиса
      pageSize: { type: 'string', default: '10' },
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
      title: { type: 'string', minLength: 1, maxLength: 100 },
    },
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
  description: 'Update tier list title or theme',
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
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 100 },
      theme: { type: 'string' },
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
            // string | number — как в saveAllSchema: временные ID книг приходят строками
            bookId: { type: ['number', 'string'] },
            tierId: { type: ['number', 'string', 'null'] },
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
            // Лимиты не строже shelf-схемы (title ≤500, author ≤300, genre ≤200,
            // description ≤5000) — CreateTierListModal пересылает эти поля как есть
            title: { type: 'string', minLength: 1, maxLength: 500 },
            author: { type: ['string', 'null'], maxLength: 300 },
            // maxLength НЕ задаём: coverImageUrl принимает base64 data:-обложки
            // (многокилобайтные) — роут сам валидирует размер через validateImageSize
            coverImageUrl: { type: ['string', 'null'] },
            description: { type: ['string', 'null'], maxLength: 5000 },
            // Без maxLength: БД-колонка безлимитна, вызывающий код не ограничивает
            thoughts: { type: ['string', 'null'] },
            genre: { type: ['string', 'null'], maxLength: 200 },
            tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 20 },
            externalId: { type: ['string', 'null'], maxLength: 255, description: 'ID книги во внешнем источнике (Фаза 2.1)' },
            source: { type: ['string', 'null'], enum: ['google_books', 'open_library', 'livelib'], description: 'Источник внешнего ID (Фаза 2.1)' },
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
      title: { type: 'string', minLength: 1, maxLength: 255 },
      author: { type: 'string', maxLength: 255 },
      // Без maxLength: BookEditModal (textarea) не ограничивает ввод, БД-колонки
      // безлимитны — активация валидации не должна ломать сохранение длинных текстов
      description: { type: 'string' },
      thoughts: { type: 'string' },
      genre: { type: ['string', 'null'], maxLength: 100 },
      // Без maxItems/itemLength: инпут тегов в BookEditModal без maxLength
      tags: { type: 'array', items: { type: 'string' } },
      // Без maxLength: принимает base64 data:-обложки (см. addBooksSchema)
      coverImageUrl: { type: 'string' },
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
  // response-блок сознательно убран: реальный ответ — полный Prisma-объект тир-листа,
  // объявлять в схеме только id/isPublic нельзя — fast-json-stringify вырежет остальные поля
};

export const getPublicTierListsSchema = {
  description: 'Get public tier lists (for template library)',
  tags: ['Tier Lists'],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', default: '1', description: 'Page number' },
      pageSize: { type: 'string', default: '10', description: 'Items per page' },
      sortBy: { type: 'string', enum: ['updatedAt', 'updated_at', 'likes', 'created', 'created_at'], default: 'updatedAt', description: 'Sort field' },
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
              id: { type: 'string', description: 'Tier list ID (UUID or integer)' },
              title: { type: 'string', description: 'Tier list title' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              isPublic: { type: 'boolean' },
              slug: { type: 'string', description: 'Tier list slug' },
              coverImageUrl: { type: 'string', description: 'Custom cover image URL' },
              authorName: { type: 'string', description: 'Author username' },
              authorAvatar: { type: 'string', description: 'Author avatar URL' },
              booksCount: { type: 'number', description: 'Number of books' },
              likesCount: { type: 'number', description: 'Number of likes' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            totalItems: { type: 'number', description: 'Total tier lists' },
            totalPages: { type: 'number', description: 'Total pages' },
            currentPage: { type: 'number', description: 'Current page' },
          },
        },
        links: {
          type: 'object',
          properties: {
            self: { type: 'string', description: 'Current page URL' },
            next: { type: 'string', description: 'Next page URL' },
            prev: { type: 'string', description: 'Previous page URL' },
            last: { type: 'string', description: 'Last page URL' },
          },
        },
      },
    },
    401: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', enum: ['unauthorized', 'token_invalid'] },
            message: { type: 'string' },
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

export const saveAllSchema = {
  description: 'Atomic save for all tier list changes (tiers, books, placements)',
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
    properties: {
      tiers: {
        type: 'object',
        properties: {
          added: {
            type: 'array',
            items: {
              type: 'object',
              required: ['tempId', 'title', 'color', 'rank'],
              properties: {
                tempId: { type: 'string' },
                title: { type: 'string' },
                color: { type: 'string' },
                rank: { type: 'number' },
                labelSize: { type: 'string' },
                labelWeight: { type: 'string' },
                labelStyle: { type: 'string' },
                labelColor: { type: 'string' },
              },
            },
          },
          updated: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'title', 'color', 'rank'],
              properties: {
                id: { type: 'number' },
                title: { type: 'string' },
                color: { type: 'string' },
                rank: { type: 'number' },
                labelSize: { type: 'string' },
                labelWeight: { type: 'string' },
                labelStyle: { type: 'string' },
                labelColor: { type: 'string' },
              },
            },
          },
          deletedIds: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      },
      newBooks: {
        type: 'array',
        items: {
          type: 'object',
          required: ['tempId', 'title', 'coverImageUrl'],
          properties: {
            tempId: { type: 'string' },
            title: { type: 'string' },
            author: { type: ['string', 'null'] },
            coverImageUrl: { type: 'string' },
            description: { type: ['string', 'null'] },
            thoughts: { type: ['string', 'null'] },
          },
        },
      },
      placements: {
        type: 'array',
        items: {
          type: 'object',
          required: ['bookId', 'tierId', 'rank'],
          properties: {
            bookId: { type: ['number', 'string'] },
            tierId: { type: ['number', 'string', 'null'] },
            rank: { type: 'number' },
          },
        },
      },
      deletedBookIds: {
        type: 'array',
        items: { type: 'number' },
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            newAchievements: { type: 'array' },
            bookReplacements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tempId: { type: 'string' },
                  realId: { type: 'string' },
                },
              },
            },
            tierReplacements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tempId: { type: 'string' },
                  realId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
};
