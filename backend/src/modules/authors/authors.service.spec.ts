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
  authorFindMany?: unknown;
  placementFindMany?: unknown;
}

function makePrisma(overrides: MockOverrides = {}) {
  return {
    author: {
      findUnique: vi.fn().mockResolvedValue(overrides.authorFindUnique ?? null),
      findMany: vi.fn().mockResolvedValue(overrides.authorFindMany ?? []),
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

  it('страница доступна без seoDescription (ручной контент)', async () => {
    const { service } = makeService({
      authorFindUnique: { id: 1, name: 'X', slug: 'x', seoDescription: null, books: [],
        stats: [], showcase: [], adaptations: [], pressQuotes: [] },
    });
    const data = await service.getBySlug('x');
    expect(data).not.toBeNull();
    expect(data!.author.seoDescription).toBe('');
  });

  it('ищет по slug и запрашивает только published каталоговые книги', async () => {
    const { service, prisma } = makeService({
      authorFindUnique: { id: 1, name: 'X', slug: 'x', seoDescription: 'Текст', books: [],
        stats: [], showcase: [], adaptations: [], pressQuotes: [] },
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
          stats: { orderBy: { order: 'asc' } },
          showcase: { orderBy: { order: 'asc' }, include: { book: { include: { _count: { select: { ratings: true } } } } } },
          adaptations: { orderBy: { order: 'asc' } },
          pressQuotes: { orderBy: { order: 'asc' } },
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
        stats: [], showcase: [], adaptations: [], pressQuotes: [],
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
        stats: [], showcase: [], adaptations: [], pressQuotes: [],
      },
    });
    const data = await service.getBySlug('x');
    expect(data!.author.avgRating).toBeNull();
    expect(data!.topBooks).toEqual([]);
    expect(data!.bottomBooks).toEqual([]);
  });
});

describe("getBySlug — ручной контент автора", () => {
  const contentAuthor = () => ({
    id: 1, name: "Артур Вэнс", slug: "artur-vans", seoDescription: "Описание.",
    heroImageUrl: "/hero.jpg", badge: "Лауреат Букеровской премии",
    motto: "«Литература как архитектура памяти»",
    manifestoQuote: "Каждое предложение — возведение пространства.",
    manifestoAuthor: "Критик Иванов", manifestoRole: "Обозреватель",
    aboutText: "Текст о творчестве.", books: [],
    stats: [{ value: "14 млн", label: "напечатанных книг в мире" }],
    showcase: [{
      pullQuote: "Монументальное полотно",
      book: {
        id: 7, title: "Архитектура тишины", slug: "arhitektura-tishiny",
        coverImageUrl: "/7.jpg", publishedYear: 2018, genre: "Роман",
        rating: 9.1, isbn: "978-5-1", description: "Описание книги.",
        _count: { ratings: 40 },
      },
    }],
    adaptations: [{ kind: "film", title: "Тени монолита", meta: "2024", description: "Экранизация", url: "https://imdb.com/x" }],
    pressQuotes: [{ quote: "Вэнс возвращает литературе монументальность.", source: "The New Yorker", sourceRole: "Обозреватель" }],
  });

  it("возвращает hero-поля, статистику, showcase, адаптации, прессу", async () => {
    const { service } = makeService({ authorFindUnique: contentAuthor(), placementFindMany: [] });
    const data = await service.getBySlug("artur-vans");
    expect(data).not.toBeNull();
    expect(data!.author).toMatchObject({
      heroImageUrl: "/hero.jpg", badge: "Лауреат Букеровской премии",
      motto: "«Литература как архитектура памяти»",
      manifestoQuote: "Каждое предложение — возведение пространства.",
      manifestoAuthor: "Критик Иванов", manifestoRole: "Обозреватель",
      aboutText: "Текст о творчестве.",
    });
    expect(data!.stats).toHaveLength(1);
    expect(data!.showcase[0].pullQuote).toBe("Монументальное полотно");
    expect(data!.showcase[0].book.isbn).toBe("978-5-1");
    expect(data!.showcase[0].book.description).toBe("Описание книги.");
    expect(data!.adaptations[0].kind).toBe("film");
    expect(data!.pressQuotes[0].source).toBe("The New Yorker");
  });

  it("без ручного контента — новые секции пустые, hero-поля null", async () => {
    const { service } = makeService({
      authorFindUnique: {
        id: 2, name: "X", slug: "x", seoDescription: "Текст",
        heroImageUrl: null, badge: null, motto: null, manifestoQuote: null,
        manifestoAuthor: null, manifestoRole: null, aboutText: null,
        books: [], stats: [], showcase: [], adaptations: [], pressQuotes: [],
      },
      placementFindMany: [],
    });
    const data = await service.getBySlug("x");
    expect(data!.stats).toEqual([]);
    expect(data!.showcase).toEqual([]);
    expect(data!.adaptations).toEqual([]);
    expect(data!.pressQuotes).toEqual([]);
    expect(data!.author.heroImageUrl).toBeNull();
    expect(data!.author.motto).toBeNull();
  });

  it("include запрашивает контент с сортировкой по order", async () => {
    const { service, prisma } = makeService({
      authorFindUnique: { ...contentAuthor(), books: [] },
      placementFindMany: [],
    });
    await service.getBySlug("artur-vans");
    expect(prisma.author.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          stats: { orderBy: { order: "asc" } },
          adaptations: { orderBy: { order: "asc" } },
          pressQuotes: { orderBy: { order: "asc" } },
          showcase: expect.objectContaining({ orderBy: { order: "asc" } }),
        }),
      }),
    );
  });
});

// ——— Авто-факты об адаптациях из лонгридов книг автора ———

function makeBook(over: Record<string, unknown> = {}) {
  return {
    id: 1, title: "Книга", slug: "kniga", coverImageUrl: "", publishedYear: 2000,
    genre: null, rating: null, _count: { ratings: 0 }, contextChain: [], ...over,
  };
}

function makeChain(over: unknown[] = []) {
  return over;
}

describe("getBySlug — авто-факты из лонгридов (contextChain)", () => {
  const base = (books: unknown[], adaptations: unknown[] = []) => ({
    id: 1, name: "Автор", slug: "avtor", seoDescription: "Текст",
    books, stats: [], showcase: [], adaptations, pressQuotes: [],
  });

  it("добавляет блоки contextChain c icon=movie в конец adaptations", async () => {
    const { service } = makeService({
      authorFindUnique: base([
        makeBook({ contextChain: makeChain([
          { icon: "movie", title: "Экранизация 1975 года", text: "Фильм снят режиссёром X." },
        ]) }),
      ]),
      placementFindMany: [],
    });
    const data = await service.getBySlug("avtor");
    expect(data!.adaptations).toHaveLength(1);
    expect(data!.adaptations[0]).toEqual({
      kind: "film",
      title: "Экранизация 1975 года",
      description: "Фильм снят режиссёром X.",
      meta: "Книга",
      url: "/books/kniga",
    });
  });

  it("ручные адаптации идут перед авто-фактами", async () => {
    const { service } = makeService({
      authorFindUnique: base(
        [makeBook({ contextChain: makeChain([
          { icon: "movie", title: "Авто", text: "Из лонгрида." },
        ]) })],
        [{ kind: "film", title: "Ручная", meta: "2024", description: "Админ", url: "https://imdb.com/x" }],
      ),
      placementFindMany: [],
    });
    const data = await service.getBySlug("avtor");
    expect(data!.adaptations.map((a) => a.title)).toEqual(["Ручная", "Авто"]);
  });

  it("игнорирует блоки с другими иконками и невалидные элементы", async () => {
    const { service } = makeService({
      authorFindUnique: base([
        makeBook({ contextChain: makeChain([
          { icon: "history_edu", title: "История", text: "Не кино." },
          { icon: "movie", title: "" },            // без title
          { icon: "movie", title: "X" },           // без text
          null,                                    // мусор
          "строка",                                // мусор
          { title: "Без иконки", text: "Текст" },  // без icon
          { icon: "movie", title: "Нормальный", text: "Да." },
        ]) }),
      ]),
      placementFindMany: [],
    });
    const data = await service.getBySlug("avtor");
    expect(data!.adaptations.map((a) => a.title)).toEqual(["Нормальный"]);
  });

  it("лимит 8 авто-фактов, новые книги первыми", async () => {
    const chain = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ icon: "movie", title: `Факт ${i + 1}`, text: "Т." }));
    const { service } = makeService({
      authorFindUnique: base([
        makeBook({ id: 1, title: "Старая", slug: "staraya", publishedYear: 1990,
          contextChain: makeChain(chain(5)) }),
        makeBook({ id: 2, title: "Новая", slug: "novaya", publishedYear: 2020,
          contextChain: makeChain(chain(5)) }),
      ]),
      placementFindMany: [],
    });
    const data = await service.getBySlug("avtor");
    expect(data!.adaptations).toHaveLength(8);
    // 5 фактов новой книги, затем 3 старой
    expect(data!.adaptations.slice(0, 5).every((a) => a.meta === "Новая")).toBe(true);
    expect(data!.adaptations.slice(5).map((a) => a.meta)).toEqual(["Старая", "Старая", "Старая"]);
  });

  it("книги без года — в конце списка авто-фактов", async () => {
    const movie = [{ icon: "movie", title: "Факт", text: "Т." }];
    const { service } = makeService({
      authorFindUnique: base([
        makeBook({ id: 1, title: "Без года", slug: "bez-goda", publishedYear: null,
          contextChain: makeChain(movie) }),
        makeBook({ id: 2, title: "С годом", slug: "s-godom", publishedYear: 1984,
          contextChain: makeChain(movie) }),
      ]),
      placementFindMany: [],
    });
    const data = await service.getBySlug("avtor");
    expect(data!.adaptations.map((a) => a.meta)).toEqual(["С годом", "Без года"]);
  });

  it("битый contextChain (не массив) не валит страницу", async () => {
    const { service } = makeService({
      authorFindUnique: base([
        makeBook({ contextChain: "не массив" }),
        makeBook({ id: 2, slug: "drugaya", contextChain: null }),
      ]),
      placementFindMany: [],
    });
    const data = await service.getBySlug("avtor");
    expect(data!.adaptations).toEqual([]);
  });

  it("книга без slug — авто-факт без ссылки", async () => {
    const { service } = makeService({
      authorFindUnique: base([
        makeBook({ slug: null, contextChain: makeChain([
          { icon: "movie", title: "Факт", text: "Т." },
        ]) }),
      ]),
      placementFindMany: [],
    });
    const data = await service.getBySlug("avtor");
    expect(data!.adaptations[0].url).toBeNull();
    expect(data!.adaptations[0].meta).toBe("Книга");
  });
});

// ——— GET /api/authors — список всех авторов (страница «Все авторы») ———

describe("list", () => {
  it("фильтрует мусор и авторов без книг, маппит поля", async () => {
    const { service } = makeService({
      authorFindMany: [
        { id: 1, name: "Лев Толстой", slug: "lev-tolstoy", _count: { books: 3 } },
        // Название книги, а не автора — должно быть отфильтровано
        { id: 2, name: "«Война и мир»", slug: "voyna-i-mir", _count: { books: 1 } },
        // Без опубликованных каталоговых книг — не попадает в каталог
        { id: 3, name: "Без книг", slug: "bez-knig", _count: { books: 0 } },
      ],
    });

    const authors = await service.list();

    expect(authors).toEqual([
      { id: 1, name: "Лев Толстой", slug: "lev-tolstoy", bookCount: 3 },
    ]);
  });

  it("запрашивает только опубликованные каталоговые книги и сортирует по алфавиту", async () => {
    const { service, prisma } = makeService({ authorFindMany: [] });

    await service.list();

    expect(prisma.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { books: { some: { status: "published", userId: null } } },
        orderBy: { name: "asc" },
      }),
    );
  });

  it("пустая БД — пустой список", async () => {
    const { service } = makeService({ authorFindMany: [] });
    expect(await service.list()).toEqual([]);
  });

  it("sort=popular — по убыванию числа книг, limit обрезает", async () => {
    const { service } = makeService({
      authorFindMany: [
        { id: 1, name: "А", slug: "a", _count: { books: 2 } },
        { id: 2, name: "Б", slug: "b", _count: { books: 9 } },
        { id: 3, name: "В", slug: "v", _count: { books: 5 } },
      ],
    });

    const authors = await service.list({ sort: "popular", limit: 2 });

    expect(authors.map((a) => a.slug)).toEqual(["b", "v"]);
  });
});
