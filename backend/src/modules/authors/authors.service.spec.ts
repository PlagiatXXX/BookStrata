import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { looksLikeBookTitle, createAuthorService } from './authors.service.js';

describe('looksLikeBookTitle', () => {
  describe('реальные имена авторов — должны вернуть false', () => {
    it('обычное русское имя', () => {
      expect(looksLikeBookTitle('Лев Толстой')).toBe(false);
    });

    it('имя с инициалами', () => {
      expect(looksLikeBookTitle('Ф. М. Достоевский')).toBe(false);
    });

    it('полное имя', () => {
      expect(looksLikeBookTitle('Фёдор Достоевский')).toBe(false);
    });

    it('западное имя', () => {
      expect(looksLikeBookTitle('J.K. Rowling')).toBe(false);
    });

    it('японское имя', () => {
      expect(looksLikeBookTitle('Haruki Murakami')).toBe(false);
    });

    it('длинное имя (до 100 символов)', () => {
      const longName = 'Александр Сергеевич Пушкин';
      expect(longName.length).toBeLessThan(100);
      expect(looksLikeBookTitle(longName)).toBe(false);
    });

    it('апостроф в имени', () => {
      expect(looksLikeBookTitle("O'Brien")).toBe(false);
    });

    it('дефис в имени', () => {
      expect(looksLikeBookTitle('Салтыков-Щедрин')).toBe(false);
    });
  });

  describe('названия книг — должны вернуть true', () => {
    it('кавычки-ёлочки в названии', () => {
      expect(looksLikeBookTitle('Жареные зеленые помидоры в кафе «Полустанок»')).toBe(true);
    });

    it('ещё название с ёлочками', () => {
      expect(looksLikeBookTitle('Повесть о Ферме-На-Холме')).toBe(false);
    });

    it('название с кавычками в начале', () => {
      expect(looksLikeBookTitle('«Война и мир»')).toBe(true);
    });

    it('имя длиннее 100 символов', () => {
      const veryLong = 'Очень длинное название книги, которое явно не является именем автора, потому что никто так не называется, это просто книга с очень длинным названием';
      expect(veryLong.length).toBeGreaterThan(100);
      expect(looksLikeBookTitle(veryLong)).toBe(true);
    });

    it('имя с переносом строки', () => {
      expect(looksLikeBookTitle('Автор\nс переносом')).toBe(true);
    });
  });

  describe('граничные случаи', () => {
    it('пустая строка после trim', () => {
      expect(looksLikeBookTitle('   ')).toBe(false);
    });

    it('пустая строка', () => {
      expect(looksLikeBookTitle('')).toBe(false);
    });

    it('короткое имя', () => {
      expect(looksLikeBookTitle('Имя')).toBe(false);
    });
  });
});

// ——— GET /api/authors/:slug — данные страницы автора ———

interface MockOverrides {
  authorFindUnique?: unknown;
  placementFindMany?: unknown;
}

function makePrisma(overrides: MockOverrides = {}) {
  return {
    author: {
      findUnique: vi.fn().mockResolvedValue(overrides.authorFindUnique ?? null),
    },
    bookPlacement: {
      findMany: vi.fn().mockResolvedValue(overrides.placementFindMany ?? []),
    },
  };
}

function makeService(overrides: MockOverrides = {}) {
  const prisma = makePrisma(overrides);
  const service = createAuthorService(prisma as unknown as PrismaClient);
  return { service, prisma };
}

describe('getBySlug', () => {
  it('null если автор не найден', async () => {
    const { service } = makeService();
    expect(await service.getBySlug('net-takogo')).toBeNull();
  });

  it('null если у автора нет seoDescription (страница не публикуется)', async () => {
    const { service } = makeService({
      authorFindUnique: { id: 1, name: 'X', slug: 'x', seoDescription: null, books: [] },
    });
    expect(await service.getBySlug('x')).toBeNull();
  });

  it('ищет по slug и запрашивает только published каталоговые книги', async () => {
    const { service, prisma } = makeService({
      authorFindUnique: { id: 1, name: 'X', slug: 'x', seoDescription: 'Текст', books: [] },
    });
    await service.getBySlug('x');
    expect(prisma.author.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'x' },
        include: {
          books: {
            where: { status: 'published', userId: null },
            include: { _count: { select: { ratings: true } } },
          },
        },
      }),
    );
  });

  it('страница: сортировка по году (null в конец), avgRating, топ/худшие по порогу, tierLists', async () => {
    const books = [
      { id: 3, title: 'Без года', slug: null, coverImageUrl: '', publishedYear: null,
        genre: null, rating: 9.0, _count: { ratings: 10 } },
      { id: 1, title: 'А', slug: 'a', coverImageUrl: '', publishedYear: 1984,
        genre: null, rating: 8.5, _count: { ratings: 3 } }, // ниже порога — не в топе
      { id: 2, title: 'Б', slug: 'b', coverImageUrl: '', publishedYear: 2000,
        genre: null, rating: 9.5, _count: { ratings: 7 } },
    ];
    const { service } = makeService({
      authorFindUnique: {
        id: 1, name: 'Автор', slug: 'avtor',
        seoDescription: 'Первый абзац. Второй.', books,
      },
      placementFindMany: [
        { tierListId: 't1', tierList: { id: 't1', slug: 'tl-1', title: 'Лучшее' } },
      ],
    });

    const data = await service.getBySlug('avtor');
    expect(data).not.toBeNull();

    // сортировка: 1984, 2000, затем null
    expect(data!.books.map((b) => b.id)).toEqual([1, 2, 3]);
    // avgRating: (9.0 + 8.5 + 9.5) / 3 = 9.0
    expect(data!.author.avgRating).toBe(9);
    expect(data!.author.bookCount).toBe(3);
    // топ/худшие: только книги с >= 5 оценок
    expect(data!.topBooks.map((b) => b.id)).toEqual([2, 3]);
    expect(data!.bottomBooks.map((b) => b.id)).toEqual([3, 2]);
    expect(data!.tierLists).toEqual([{ id: 't1', slug: 'tl-1', title: 'Лучшее' }]);
  });

  it('avgRating null если у книг нет оценок', async () => {
    const { service } = makeService({
      authorFindUnique: {
        id: 1, name: 'X', slug: 'x', seoDescription: 'Текст',
        books: [{ id: 1, title: 'A', slug: null, coverImageUrl: '', publishedYear: null,
          genre: null, rating: null, _count: { ratings: 0 } }],
      },
    });
    const data = await service.getBySlug('x');
    expect(data!.author.avgRating).toBeNull();
    expect(data!.topBooks).toEqual([]);
    expect(data!.bottomBooks).toEqual([]);
  });
});
