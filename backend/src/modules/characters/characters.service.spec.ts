// backend/src/modules/characters/characters.service.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import type { BookCharacterInput } from "./characters.schema.js";

const { mockTx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    character: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    bookCharacter: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    bookCharacterRelation: {
      createMany: vi.fn(),
    },
  };

  const prisma = {
    character: {
      findMany: vi.fn(),
    },
    bookCharacter: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };

  return { mockTx: tx, mockPrisma: prisma };
});

vi.mock("../../lib/prisma.js", () => ({
  prisma: mockPrisma,
}));

import {
  getBookCharactersView,
  replaceBookCharacters,
  searchCharacters,
  transferCharactersIfCanonEmpty,
} from "./characters.service.js";

function makeInput(overrides: Partial<BookCharacterInput> = {}): BookCharacterInput {
  return {
    name: "Геральт",
    aliases: [],
    universeSlug: "the-witcher",
    role: "protagonist",
    summary: "Ведьмак-мутант, охотник на чудовищ и мастер меча из Ривии.",
    traits: ["стоический"],
    relations: [],
    ...overrides,
  };
}

describe("characters.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );
    mockTx.bookCharacter.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.bookCharacter.updateMany.mockResolvedValue({ count: 0 });
    mockTx.bookCharacterRelation.createMany.mockResolvedValue({ count: 0 });
  });

  describe("getBookCharactersView", () => {
    it("возвращает отсортированных героев с relations и запрашивает только published/не-merged otherBooks со слагом", async () => {
      mockPrisma.bookCharacter.findMany.mockResolvedValue([
        {
          id: 101,
          bookId: 10,
          characterId: 1,
          role: "protagonist",
          summary: "Главный герой саги, ведьмак из Школы Волка.",
          traits: ["хладнокровный", "верный"],
          sortOrder: 0,
          character: {
            id: 1,
            slug: "geralt",
            name: "Геральт",
            aliases: ["Белый Волк"],
            universeSlug: "the-witcher",
            books: [
              {
                book: {
                  id: 11,
                  slug: "mech-prednaznacheniya",
                  title: "Меч Предназначения",
                },
              },
              {
                book: {
                  id: 14,
                  slug: null,
                  title: "Неожиданно без слага",
                },
              },
            ],
          },
          relationsFrom: [
            {
              label: "наставник и друг",
              to: {
                character: {
                  id: 2,
                  name: "Лютик",
                },
              },
            },
          ],
        },
        {
          id: 102,
          bookId: 10,
          characterId: 2,
          role: "supporting",
          summary: "Странствующий бард, поэт и верный спутник ведьмака.",
          traits: ["остроумный"],
          sortOrder: 1,
          character: {
            id: 2,
            slug: "lyutik",
            name: "Лютик",
            aliases: [],
            universeSlug: "the-witcher",
            books: [],
          },
          relationsFrom: [],
        },
      ]);

      const result = await getBookCharactersView(10);

      expect(mockPrisma.bookCharacter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookId: 10 },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          include: expect.objectContaining({
            character: expect.objectContaining({
              include: expect.objectContaining({
                books: expect.objectContaining({
                  where: {
                    bookId: { not: 10 },
                    book: {
                      status: "published",
                      mergedIntoId: null,
                      slug: { not: null },
                    },
                  },
                }),
              }),
            }),
          }),
        }),
      );

      expect(result).toEqual([
        {
          id: 101,
          characterId: 1,
          slug: "geralt",
          name: "Геральт",
          aliases: ["Белый Волк"],
          universeSlug: "the-witcher",
          role: "protagonist",
          summary: "Главный герой саги, ведьмак из Школы Волка.",
          traits: ["хладнокровный", "верный"],
          relations: [
            {
              targetCharacterId: 2,
              targetName: "Лютик",
              label: "наставник и друг",
            },
          ],
          otherBooks: [
            {
              id: 11,
              slug: "mech-prednaznacheniya",
              title: "Меч Предназначения",
            },
          ],
        },
        {
          id: 102,
          characterId: 2,
          slug: "lyutik",
          name: "Лютик",
          aliases: [],
          universeSlug: "the-witcher",
          role: "supporting",
          summary: "Странствующий бард, поэт и верный спутник ведьмака.",
          traits: ["остроумный"],
          relations: [],
          otherBooks: [],
        },
      ]);
    });

    it("возвращает пустой массив, если у книги нет персонажей", async () => {
      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      const result = await getBookCharactersView(99);

      expect(result).toEqual([]);
    });
  });

  describe("searchCharacters", () => {
    it("возвращает [] без запроса к БД для пустой или пробельной строки", async () => {
      expect(await searchCharacters("")).toEqual([]);
      expect(await searchCharacters("   \t\n ")).toEqual([]);
      expect(mockPrisma.character.findMany).not.toHaveBeenCalled();
    });

    it("возвращает найденных героев с bookCount и учитывает limit", async () => {
      mockPrisma.character.findMany.mockResolvedValue([
        {
          id: 1,
          slug: "geralt",
          name: "Геральт",
          aliases: ["Белый Волк", "Мясник из Блавикена"],
          universeSlug: "the-witcher",
          traits: ["стоический"],
          _count: { books: 7 },
        },
      ]);

      const result = await searchCharacters("  Геральт ", 5);

      expect(mockPrisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          where: {
            OR: [
              { name: { contains: "Геральт", mode: "insensitive" } },
              { aliases: { has: "Геральт" } },
            ],
          },
        }),
      );

      expect(result).toEqual([
        {
          id: 1,
          slug: "geralt",
          name: "Геральт",
          aliases: ["Белый Волк", "Мясник из Блавикена"],
          universeSlug: "the-witcher",
          traits: ["стоический"],
          bookCount: 7,
        },
      ]);
    });

    it("клампит limit в диапазон [1, 50]", async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      await searchCharacters("Геральт", 0);
      expect(mockPrisma.character.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 1 }),
      );

      await searchCharacters("Геральт", -10);
      expect(mockPrisma.character.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 1 }),
      );

      await searchCharacters("Геральт", 250);
      expect(mockPrisma.character.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe("replaceBookCharacters", () => {
    it("удаляет старых персонажей книги и при пустом списке возвращает []", async () => {
      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      const result = await replaceBookCharacters(10, []);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.bookCharacter.deleteMany).toHaveBeenCalledWith({
        where: { bookId: 10 },
      });
      expect(mockTx.bookCharacter.create).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("переиспользует Character по characterId и name (case-insensitive) с мержем aliases, создаёт нового с уникальным slug", async () => {
      mockTx.character.findUnique.mockImplementation(
        async (args: { where: { id?: number; slug?: string } }) => {
          if (args.where.id === 1) {
            return {
              id: 1,
              slug: "geralt",
              name: "Геральт",
              aliases: ["Белый Волк"],
              universeSlug: "the-witcher",
              traits: ["стойкий"],
            };
          }
          if (args.where.slug === "lyutik") {
            return { id: 999 };
          }
          if (args.where.slug === "lyutik-2") {
            return null;
          }
          return null;
        },
      );

      mockTx.character.findFirst
        .mockResolvedValueOnce({
          id: 2,
          slug: "jennifer",
          name: "Йеннифэр",
          aliases: ["Йен"],
          universeSlug: null,
          traits: [],
        })
        .mockResolvedValueOnce(null);

      mockTx.character.update.mockImplementation(
        async (args: { where: { id: number }; data: Record<string, unknown> }) => ({
          id: args.where.id,
          slug: args.where.id === 1 ? "geralt" : "jennifer",
          name: args.where.id === 1 ? "Геральт" : "Йеннифэр",
          aliases: args.data.aliases ?? [],
          universeSlug: args.data.universeSlug ?? null,
          traits: args.data.traits ?? [],
        }),
      );

      mockTx.character.create.mockResolvedValue({
        id: 3,
        slug: "lyutik-2",
        name: "Лютик",
        aliases: ["Юлиан Альфред Панкрац"],
        universeSlug: "the-witcher",
        traits: ["болтливый"],
      });

      mockTx.bookCharacter.create
        .mockResolvedValueOnce({ id: 201, characterId: 1 })
        .mockResolvedValueOnce({ id: 202, characterId: 2 })
        .mockResolvedValueOnce({ id: 203, characterId: 3 });

      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      await replaceBookCharacters(10, [
        makeInput({
          characterId: 1,
          name: "Геральт",
          aliases: ["белый волк", "Мясник из Блавикена"],
          traits: ["стойкий", "одиночка"],
          relations: [{ targetName: "Йеннифэр", label: "возлюбленная" }],
        }),
        makeInput({
          name: "йеннифэр",
          aliases: ["Чародейка из Венгерберга"],
          universeSlug: "the-witcher",
          role: "supporting",
          summary: "Могущественная чародейка из Венгерберга с железной волей.",
          traits: ["решительная"],
          relations: [{ targetName: "Геральт", label: "возлюбленный" }],
        }),
        makeInput({
          name: "Лютик",
          aliases: ["Юлиан Альфред Панкрац"],
          role: "supporting",
          summary: "Талантливый поэт, бард и лучший друг ведьмака Геральта.",
          traits: ["болтливый"],
          relations: [],
        }),
      ]);

      expect(mockTx.character.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          aliases: ["Белый Волк", "Мясник из Блавикена"],
          universeSlug: "the-witcher",
          traits: ["стойкий", "одиночка"],
        },
      });

      expect(mockTx.character.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: "йеннифэр", mode: "insensitive" } },
      });
      expect(mockTx.character.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          aliases: ["Йен", "Чародейка из Венгерберга"],
          universeSlug: "the-witcher",
          traits: ["решительная"],
        },
      });

      expect(mockTx.character.create).toHaveBeenCalledWith({
        data: {
          name: "Лютик",
          slug: "lyutik-2",
          aliases: ["Юлиан Альфред Панкрац"],
          universeSlug: "the-witcher",
          traits: ["болтливый"],
        },
      });

      expect(mockTx.bookCharacterRelation.createMany).toHaveBeenCalledWith({
        data: [
          { fromId: 201, toId: 202, label: "возлюбленная" },
          { fromId: 202, toId: 201, label: "возлюбленный" },
        ],
        skipDuplicates: true,
      });
    });

    it("не вызывает tx.character.update, если aliases, traits и universeSlug не изменились", async () => {
      mockTx.character.findUnique.mockResolvedValue({
        id: 1,
        slug: "geralt",
        name: "Геральт",
        aliases: ["Белый Волк"],
        universeSlug: "the-witcher",
        traits: ["стоический"],
      });
      mockTx.bookCharacter.create.mockResolvedValue({ id: 201, characterId: 1 });
      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      await replaceBookCharacters(10, [
        makeInput({
          characterId: 1,
          name: "Геральт",
          aliases: ["белый волк"],
          universeSlug: "the-witcher",
          traits: ["СТОИЧЕСКИЙ"],
        }),
      ]);

      expect(mockTx.character.update).not.toHaveBeenCalled();
      expect(mockTx.bookCharacter.create).toHaveBeenCalledTimes(1);
    });

    it("использует фоллбэк slug 'character' при пустом slugify и разрешает коллизию двух слагов в одной транзакции", async () => {
      const createdBySlug = new Map<string, { id: number; slug: string; name: string }>();
      let nextCharId = 10;

      mockTx.character.findUnique.mockImplementation(
        async (args: { where: { slug?: string } }) => {
          if (args.where.slug && createdBySlug.has(args.where.slug)) {
            return { id: createdBySlug.get(args.where.slug)!.id };
          }
          return null;
        },
      );
      mockTx.character.findFirst.mockResolvedValue(null);
      mockTx.character.create.mockImplementation(
        async (args: { data: { name: string; slug: string; aliases: string[]; universeSlug: string | null; traits: string[] } }) => {
          const created = {
            id: nextCharId++,
            ...args.data,
          };
          createdBySlug.set(created.slug, created);
          return created;
        },
      );
      mockTx.bookCharacter.create
        .mockResolvedValueOnce({ id: 301, characterId: 10 })
        .mockResolvedValueOnce({ id: 302, characterId: 11 });
      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      await replaceBookCharacters(10, [
        makeInput({ name: "???" }),
        makeInput({ name: "!!!" }),
      ]);

      expect(mockTx.character.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: expect.objectContaining({ slug: "character" }) }),
      );
      expect(mockTx.character.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: expect.objectContaining({ slug: "character-2" }) }),
      );
    });

    it("проверяет fallback slug с timestamp через findUnique, если все 20 попыток заняты", async () => {
      const checkedSlugs: string[] = [];
      mockTx.character.findFirst.mockResolvedValue(null);
      mockTx.character.findUnique.mockImplementation(
        async (args: { where: { slug?: string } }) => {
          const slug = args.where.slug ?? "";
          checkedSlugs.push(slug);
          // Первые 20 попыток заняты (geralt, geralt-2 .. geralt-20)
          if (slug === "geralt" || /^geralt-(?:[2-9]|1\d|20)$/.test(slug)) {
            return { id: 999 };
          }
          return null;
        },
      );
      mockTx.character.create.mockImplementation(
        async (args: { data: { slug: string; name: string; aliases: string[]; universeSlug: string | null; traits: string[] } }) => ({
          id: 50,
          ...args.data,
        }),
      );
      mockTx.bookCharacter.create.mockResolvedValue({ id: 501, characterId: 50 });
      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      await replaceBookCharacters(10, [makeInput({ name: "Геральт" })]);

      expect(checkedSlugs.length).toBe(21);
      const fallbackSlug = checkedSlugs[20];
      expect(fallbackSlug).toMatch(/^geralt-[0-9a-z]+$/);
      expect(mockTx.character.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: fallbackSlug }),
        }),
      );
    });

    it("ограничивает рост aliases и traits до 20 элементов при мерже", async () => {
      const existingAliases = Array.from({ length: 18 }, (_, i) => `Alias ${i + 1}`);
      const incomingAliases = ["Alias 19", "Alias 20", "Alias 21", "Alias 22"];
      const existingTraits = Array.from({ length: 19 }, (_, i) => `Trait ${i + 1}`);
      const incomingTraits = ["Trait 20", "Trait 21"];

      mockTx.character.findUnique.mockResolvedValue({
        id: 1,
        slug: "geralt",
        name: "Геральт",
        aliases: existingAliases,
        universeSlug: "the-witcher",
        traits: existingTraits,
      });
      mockTx.character.update.mockImplementation(
        async (args: { data: Record<string, unknown> }) => ({
          id: 1,
          slug: "geralt",
          name: "Геральт",
          ...args.data,
        }),
      );
      mockTx.bookCharacter.create.mockResolvedValue({ id: 201, characterId: 1 });
      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      await replaceBookCharacters(10, [
        makeInput({
          characterId: 1,
          aliases: incomingAliases,
          traits: incomingTraits,
        }),
      ]);

      expect(mockTx.character.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          aliases: [...existingAliases, "Alias 19", "Alias 20"],
          universeSlug: "the-witcher",
          traits: [...existingTraits, "Trait 20"],
        },
      });
    });

    it("фильтрует самоссылки, несуществующие цели, пробельные label и дубли одинаковых связей", async () => {
      mockTx.character.findUnique.mockResolvedValue(null);
      mockTx.character.findFirst.mockResolvedValue(null);
      mockTx.character.create
        .mockResolvedValueOnce({
          id: 1,
          slug: "geralt",
          name: "Геральт",
          aliases: ["Белый Волк"],
          universeSlug: null,
          traits: [],
        })
        .mockResolvedValueOnce({
          id: 2,
          slug: "lyutik",
          name: "Лютик",
          aliases: [],
          universeSlug: null,
          traits: [],
        });

      mockTx.bookCharacter.create
        .mockResolvedValueOnce({ id: 301, characterId: 1 })
        .mockResolvedValueOnce({ id: 302, characterId: 2 });

      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      await replaceBookCharacters(10, [
        makeInput({
          name: "Геральт",
          aliases: ["Белый Волк"],
          relations: [
            { targetName: "Геральт", label: "сам себе враг" },
            { targetName: "белый волк", label: "альтер-эго" },
            { targetName: "Цири", label: "подопечная" },
            { targetName: "Лютик", label: "   " },
            { targetName: "лютик", label: "друг" },
            { targetName: "Лютик", label: "друг" },
          ],
        }),
        makeInput({
          name: "Лютик",
          role: "supporting",
          summary: "Странствующий поэт, бард и верный спутник Геральта.",
          relations: [],
        }),
      ]);

      expect(mockTx.bookCharacterRelation.createMany).toHaveBeenCalledTimes(1);
      expect(mockTx.bookCharacterRelation.createMany).toHaveBeenCalledWith({
        data: [{ fromId: 301, toId: 302, label: "друг" }],
        skipDuplicates: true,
      });
    });

    it("дедуплицирует повторно переданный characterId и не пересчитывает sortOrder с пропусками", async () => {
      mockTx.character.findUnique.mockImplementation(
        async (args: { where: { id?: number } }) => {
          if (args.where.id === 5) {
            return {
              id: 5,
              slug: "geralt",
              name: "Геральт",
              aliases: [],
              universeSlug: null,
              traits: [],
            };
          }
          if (args.where.id === 6) {
            return {
              id: 6,
              slug: "lyutik",
              name: "Лютик",
              aliases: [],
              universeSlug: null,
              traits: [],
            };
          }
          return null;
        },
      );
      mockTx.bookCharacter.create
        .mockResolvedValueOnce({ id: 401, characterId: 5 })
        .mockResolvedValueOnce({ id: 402, characterId: 6 });
      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      await replaceBookCharacters(10, [
        makeInput({ characterId: 5, name: "Геральт", universeSlug: null, traits: [] }),
        makeInput({
          characterId: 5,
          name: "Геральт дубль",
          aliases: ["Новое прозвище"],
          universeSlug: null,
          traits: [],
        }),
        makeInput({
          characterId: 6,
          name: "Лютик",
          role: "supporting",
          universeSlug: null,
          traits: [],
        }),
      ]);

      expect(mockTx.character.update).not.toHaveBeenCalled();
      expect(mockTx.bookCharacter.create).toHaveBeenCalledTimes(2);
      expect(mockTx.bookCharacter.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({ characterId: 5, sortOrder: 0 }),
        }),
      );
      expect(mockTx.bookCharacter.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({ characterId: 6, sortOrder: 1 }),
        }),
      );
    });

    it("не вызывает tx.character.update для дубля без characterId, разрешившегося к тому же Character", async () => {
      mockTx.character.findFirst.mockResolvedValue({
        id: 7,
        slug: "geralt",
        name: "Геральт",
        aliases: [],
        universeSlug: null,
        traits: [],
      });
      mockTx.character.update.mockResolvedValue({
        id: 7,
        slug: "geralt",
        name: "Геральт",
        aliases: [],
        universeSlug: "the-witcher",
        traits: ["стоический"],
      });
      mockTx.bookCharacter.create
        .mockResolvedValueOnce({ id: 401, characterId: 7 })
        .mockResolvedValueOnce({ id: 402, characterId: 8 });
      mockTx.character.findUnique.mockResolvedValue({
        id: 8,
        slug: "lyutik",
        name: "Лютик",
        aliases: [],
        universeSlug: "the-witcher",
        traits: ["стоический"],
      });
      mockPrisma.bookCharacter.findMany.mockResolvedValue([]);

      await replaceBookCharacters(10, [
        makeInput({ name: "Геральт", aliases: [] }),
        // Дубль без characterId, но с новым alias — НЕ должен мутировать Character id=7
        makeInput({ name: "геральт", aliases: ["Лишний алиас"] }),
        makeInput({ characterId: 8, name: "Лютик" }),
      ]);

      // update вызван ровно 1 раз — только для первого "Геральта" (дозаполнение universeSlug/traits),
      // но НЕ для отброшенного второго "геральт"
      expect(mockTx.character.update).toHaveBeenCalledTimes(1);
      expect(mockTx.character.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: expect.objectContaining({
          aliases: [],
        }),
      });

      expect(mockTx.bookCharacter.create).toHaveBeenCalledTimes(2);
      expect(mockTx.bookCharacter.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({ characterId: 8, sortOrder: 1 }),
        }),
      );
    });
  });

  describe("transferCharactersIfCanonEmpty", () => {
    it("удаляет связи дубля, если у канона уже есть персонажи", async () => {
      mockTx.bookCharacter.count.mockResolvedValueOnce(3);

      await transferCharactersIfCanonEmpty(20, 10);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.bookCharacter.count).toHaveBeenCalledTimes(1);
      expect(mockTx.bookCharacter.count).toHaveBeenCalledWith({
        where: { bookId: 10 },
      });
      expect(mockTx.bookCharacter.updateMany).not.toHaveBeenCalled();
      expect(mockTx.bookCharacter.deleteMany).toHaveBeenCalledWith({
        where: { bookId: 20 },
      });
    });

    it("переносит персонажей дубля на канон одним updateMany, если у канона 0 персонажей", async () => {
      mockTx.bookCharacter.count.mockResolvedValueOnce(0);
      mockTx.bookCharacter.updateMany.mockResolvedValue({ count: 4 });

      await transferCharactersIfCanonEmpty(20, 10);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.bookCharacter.count).toHaveBeenCalledTimes(1);
      expect(mockTx.bookCharacter.updateMany).toHaveBeenCalledWith({
        where: { bookId: 20 },
        data: { bookId: 10 },
      });
      expect(mockTx.bookCharacter.deleteMany).not.toHaveBeenCalled();
    });

    it("использует переданный tx без создания вложенной транзакции", async () => {
      const externalTx = {
        bookCharacter: {
          count: vi.fn().mockResolvedValueOnce(0),
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
          deleteMany: vi.fn(),
        },
      } as unknown as Prisma.TransactionClient;

      await transferCharactersIfCanonEmpty(20, 10, externalTx);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(externalTx.bookCharacter.count).toHaveBeenCalledWith({
        where: { bookId: 10 },
      });
      expect(externalTx.bookCharacter.updateMany).toHaveBeenCalledWith({
        where: { bookId: 20 },
        data: { bookId: 10 },
      });
    });

    it("ничего не делает, если dupBookId === canonBookId", async () => {
      await transferCharactersIfCanonEmpty(10, 10);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.bookCharacter.count).not.toHaveBeenCalled();
      expect(mockTx.bookCharacter.updateMany).not.toHaveBeenCalled();
      expect(mockTx.bookCharacter.deleteMany).not.toHaveBeenCalled();
    });
  });
});
