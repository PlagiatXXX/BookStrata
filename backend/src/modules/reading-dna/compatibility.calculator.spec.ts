import { describe, it, expect } from "vitest";
import {
  calculateCompatibility,
  resolveArchetype,
  resolveArchetypeDetailed,
  ARCHETYPES,
} from "./compatibility.calculator.js";
import type { DnaAxes, ReadingDnaInput } from "./readingDna.schema.js";

describe("compatibility.calculator — 16 архетипов и психометрическая модель", () => {
  describe("resolveArchetype", () => {
    it("содержит ровно 16 уникальных читательских архетипов в 4 кастах", () => {
      expect(ARCHETYPES.length).toBe(16);
      const uniqueIds = new Set(ARCHETYPES.map((a) => a.id));
      expect(uniqueIds.size).toBe(16);
    });

    it("каждый архетип содержит названия для тем dark и craft, касту, цитату, описание, rarity, number и axisRanges", () => {
      const axisKeys = ["storyFocus", "emotionalWeight", "pace", "darkness", "scope", "complexity"] as const;
      const numbers = new Set<number>();

      for (const a of ARCHETYPES) {
        expect(a.id).toBeTruthy();
        expect(a.caste).toBeDefined();
        expect(a.caste.id).toBeTruthy();
        expect(a.caste.name).toBeTruthy();
        expect(a.names.dark).toBeTruthy();
        expect(a.names.craft).toBeTruthy();
        expect(a.quote).toBeTruthy();
        expect(a.description).toBeTruthy();
        expect(a.rarity).toBeGreaterThanOrEqual(1);
        expect(a.rarity).toBeLessThanOrEqual(10);
        expect(a.number).toBeGreaterThanOrEqual(1);
        expect(a.number).toBeLessThanOrEqual(16);
        numbers.add(a.number);

        expect(a.axisRanges).toBeDefined();
        for (const k of axisKeys) {
          const range = a.axisRanges[k];
          expect(range).toBeDefined();
          expect(range.min).toBeGreaterThanOrEqual(0);
          expect(range.max).toBeLessThanOrEqual(100);
          expect(range.min).toBeLessThan(range.max);
        }
      }

      expect(numbers.size).toBe(16);
    });

    it("корректно определяет архетип «Хранитель запретных фолиантов» при высоком мраке и катарсисе", () => {
      const darkAxes: DnaAxes = {
        storyFocus: 65,
        emotionalWeight: 85,
        pace: 45,
        darkness: 90,
        scope: 55,
        complexity: 75,
      };

      const archetype = resolveArchetype(darkAxes);
      expect(archetype.id).toBe("dark-archivist");
      expect(archetype.names.dark).toBe("Хранитель запретных фолиантов");
      expect(archetype.names.craft).toBe("Полуночный затворник");
    });

    it("корректно определяет архетип «Охотник за сюжетами» при высоком фокусе на сюжет и стремительном темпе", () => {
      const plotAxes: DnaAxes = {
        storyFocus: 15,
        emotionalWeight: 45,
        pace: 15,
        darkness: 50,
        scope: 60,
        complexity: 35,
      };

      const archetype = resolveArchetype(plotAxes);
      expect(archetype.id).toBe("plot-hunter");
      expect(archetype.names.dark).toBe("Охотник за сюжетами");
    });

    it("профиль по середине всех шкал (50/50/50/50/50/50) возвращает fallback на ближайший архетип", () => {
      const middleAxes: DnaAxes = {
        storyFocus: 50,
        emotionalWeight: 50,
        pace: 50,
        darkness: 50,
        scope: 50,
        complexity: 50,
      };

      const detailed = resolveArchetypeDetailed(middleAxes);
      expect(detailed.archetype).toBeDefined();
      expect(detailed.distance).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(detailed.distance)).toBe(true);

      const simple = resolveArchetype(middleAxes);
      expect(simple.id).toBe(detailed.archetype.id);
    });

    it("resolveArchetypeDetailed для точного совпадения с центром диапазонов архетипа дает hits === 6", () => {
      // dark-archivist: storyFocus 65, emotionalWeight 85, pace 45, darkness 90, scope 55, complexity 75
      const exactCenterAxes: DnaAxes = {
        storyFocus: 65,
        emotionalWeight: 85,
        pace: 45,
        darkness: 90,
        scope: 55,
        complexity: 75,
      };

      const detailed = resolveArchetypeDetailed(exactCenterAxes);
      expect(detailed.archetype.id).toBe("dark-archivist");
      expect(detailed.hits).toBe(6);
      expect(detailed.distance).toBe(0);
    });
  });

  describe("calculateCompatibility — окна распределения и калибровка", () => {
    // LCG: детерминированный генератор псевдослучайных чисел
    function createRng(initialSeed = 20261113) {
      let seed = initialSeed;
      return function rng(): number {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    }

    const GENRES_POOL = [
      "Фантастика", "Фэнтези", "Детектив", "Триллер", "Классика",
      "Нон-фикшн", "История", "Философия", "Поэзия", "Киберпанк",
      "Антиутопия", "Ужасы", "Приключения", "Роман", "Драма",
      "Мистика", "Биография", "Наука", "Юмор", "Постапокалипсис",
    ];

    function pickDisjointGenres(countA: number, countB: number, rng: () => number): [string[], string[]] {
      const shuffled = [...GENRES_POOL].sort(() => rng() - 0.5);
      return [shuffled.slice(0, countA), shuffled.slice(countA, countA + countB)];
    }

    it("окно random: среднее значение совместимости 3000 случайных пар лежит в диапазоне 45–60%", () => {
      const rng = createRng(20261113);
      const PAIRS_COUNT = 3000;
      let sum = 0;

      for (let i = 0; i < PAIRS_COUNT; i++) {
        const [likedA, dislikedA] = pickDisjointGenres(Math.floor(rng() * 3) + 1, Math.floor(rng() * 2) + 1, rng);
        const [likedB, dislikedB] = pickDisjointGenres(Math.floor(rng() * 3) + 1, Math.floor(rng() * 2) + 1, rng);

        const profileA: ReadingDnaInput = {
          axes: {
            storyFocus: Math.round(rng() * 100),
            emotionalWeight: Math.round(rng() * 100),
            pace: Math.round(rng() * 100),
            darkness: Math.round(rng() * 100),
            scope: Math.round(rng() * 100),
            complexity: Math.round(rng() * 100),
          },
          favoriteBooks: [
            { title: `Книга A1_${i}`, bookId: Math.floor(rng() * 50000) + 1 },
            { title: `Книга A2_${i}`, bookId: Math.floor(rng() * 50000) + 1 },
            { title: `Книга A3_${i}`, bookId: Math.floor(rng() * 50000) + 1 },
          ],
          kryptoniteBook: { title: `Криптонит A_${i}`, bookId: Math.floor(rng() * 50000) + 1 },
          likedGenres: likedA,
          dislikedGenres: dislikedA,
          favoriteAuthors: [`Автор A1_${Math.floor(rng() * 5000)}`, `Автор A2_${Math.floor(rng() * 5000)}`],
          theme: "dark",
        };

        const profileB: ReadingDnaInput = {
          axes: {
            storyFocus: Math.round(rng() * 100),
            emotionalWeight: Math.round(rng() * 100),
            pace: Math.round(rng() * 100),
            darkness: Math.round(rng() * 100),
            scope: Math.round(rng() * 100),
            complexity: Math.round(rng() * 100),
          },
          favoriteBooks: [
            { title: `Книга B1_${i}`, bookId: Math.floor(rng() * 50000) + 1 },
            { title: `Книга B2_${i}`, bookId: Math.floor(rng() * 50000) + 1 },
            { title: `Книга B3_${i}`, bookId: Math.floor(rng() * 50000) + 1 },
          ],
          kryptoniteBook: { title: `Криптонит B_${i}`, bookId: Math.floor(rng() * 50000) + 1 },
          likedGenres: likedB,
          dislikedGenres: dislikedB,
          favoriteAuthors: [`Автор B1_${Math.floor(rng() * 5000)}`, `Автор B2_${Math.floor(rng() * 5000)}`],
          theme: "craft",
        };

        const res = calculateCompatibility(profileA, profileB);
        sum += res.compatibility;
      }

      const mean = sum / PAIRS_COUNT;
      expect(mean).toBeGreaterThanOrEqual(45);
      expect(mean).toBeLessThanOrEqual(60);
    });

    it("окно close: среднее значение совместимости 3000 близких пар лежит в диапазоне 75–90%", () => {
      const rng = createRng(20261113);
      const PAIRS_COUNT = 3000;
      let sum = 0;

      const baseAxes = {
        storyFocus: 55,
        emotionalWeight: 60,
        pace: 45,
        darkness: 55,
        scope: 50,
        complexity: 60,
      };

      for (let i = 0; i < PAIRS_COUNT; i++) {
        const clamp = (val: number) => Math.max(0, Math.min(100, val));
        const delta = () => Math.round((rng() - 0.5) * 20); // ±10 пунктов

        const profileA: ReadingDnaInput = {
          axes: {
            storyFocus: clamp(baseAxes.storyFocus + delta()),
            emotionalWeight: clamp(baseAxes.emotionalWeight + delta()),
            pace: clamp(baseAxes.pace + delta()),
            darkness: clamp(baseAxes.darkness + delta()),
            scope: clamp(baseAxes.scope + delta()),
            complexity: clamp(baseAxes.complexity + delta()),
          },
          favoriteBooks: [
            { title: `Общая книга_${i}`, bookId: 1000 + i }, // 1 общая книга из 3
            { title: `Уникальная книга A1_${i}`, bookId: 20000 + i },
            { title: `Уникальная книга A2_${i}`, bookId: 30000 + i },
          ],
          kryptoniteBook: { title: `Криптонит A_${i}`, bookId: 50000 + i },
          likedGenres: ["Фантастика", "Антиутопия"], // 1 общий жанр (Jaccard = 1/3)
          dislikedGenres: ["Любовный роман", "Ужасы"], // 1 общий неприязненный жанр (Jaccard = 1/3)
          favoriteAuthors: ["Оруэлл", "Хаксли"], // 1 общий автор (Jaccard = 1/3)
          theme: "dark",
        };

        const profileB: ReadingDnaInput = {
          axes: {
            storyFocus: clamp(baseAxes.storyFocus + delta()),
            emotionalWeight: clamp(baseAxes.emotionalWeight + delta()),
            pace: clamp(baseAxes.pace + delta()),
            darkness: clamp(baseAxes.darkness + delta()),
            scope: clamp(baseAxes.scope + delta()),
            complexity: clamp(baseAxes.complexity + delta()),
          },
          favoriteBooks: [
            { title: `Общая книга_${i}`, bookId: 1000 + i }, // 1 общая книга из 3
            { title: `Уникальная книга B1_${i}`, bookId: 40000 + i },
            { title: `Уникальная книга B2_${i}`, bookId: 45000 + i },
          ],
          kryptoniteBook: { title: `Криптонит B_${i}`, bookId: 60000 + i },
          likedGenres: ["Фантастика", "Киберпанк"],
          dislikedGenres: ["Любовный роман", "Боевик"],
          favoriteAuthors: ["Оруэлл", "Гибсон"],
          theme: "craft",
        };

        const res = calculateCompatibility(profileA, profileB);
        sum += res.compatibility;
      }

      const mean = sum / PAIRS_COUNT;
      expect(mean).toBeGreaterThanOrEqual(75);
      expect(mean).toBeLessThanOrEqual(90);
    });

    it("окно twin: среднее значение для 3000 идентичных профилей лежит в диапазоне 95–99%", () => {
      const rng = createRng(20261113);
      const PAIRS_COUNT = 3000;
      let sum = 0;

      for (let i = 0; i < PAIRS_COUNT; i++) {
        const [liked, disliked] = pickDisjointGenres(3, 2, rng);

        const profile: ReadingDnaInput = {
          axes: {
            storyFocus: Math.round(rng() * 100),
            emotionalWeight: Math.round(rng() * 100),
            pace: Math.round(rng() * 100),
            darkness: Math.round(rng() * 100),
            scope: Math.round(rng() * 100),
            complexity: Math.round(rng() * 100),
          },
          favoriteBooks: [
            { title: `Книга 1_${i}`, bookId: 100 + i },
            { title: `Книга 2_${i}`, bookId: 200 + i },
            { title: `Книга 3_${i}`, bookId: 300 + i },
          ],
          kryptoniteBook: { title: `Криптонит_${i}`, bookId: 900 + i },
          likedGenres: liked,
          dislikedGenres: disliked,
          favoriteAuthors: [`Автор 1_${i}`, `Автор 2_${i}`],
          theme: "dark",
        };

        const res = calculateCompatibility(profile, profile);
        sum += res.compatibility;
      }

      const mean = sum / PAIRS_COUNT;
      expect(mean).toBeGreaterThanOrEqual(95);
      expect(mean).toBeLessThanOrEqual(99);
    });

    it("окно opposite: среднее значение для 3000 полярных профилей лежит в диапазоне 10–25%", () => {
      const rng = createRng(20261113);
      const PAIRS_COUNT = 3000;
      let sum = 0;

      for (let i = 0; i < PAIRS_COUNT; i++) {
        // Полярные предпочтения (70-95 у одного и 5-30 у другого)
        const axesA = {
          storyFocus: Math.round(70 + rng() * 25),
          emotionalWeight: Math.round(70 + rng() * 25),
          pace: Math.round(70 + rng() * 25),
          darkness: Math.round(70 + rng() * 25),
          scope: Math.round(70 + rng() * 25),
          complexity: Math.round(70 + rng() * 25),
        };

        const axesB = {
          storyFocus: 100 - axesA.storyFocus,
          emotionalWeight: 100 - axesA.emotionalWeight,
          pace: 100 - axesA.pace,
          darkness: 100 - axesA.darkness,
          scope: 100 - axesA.scope,
          complexity: 100 - axesA.complexity,
        };

        const profileA: ReadingDnaInput = {
          axes: axesA,
          favoriteBooks: [
            { title: `Книга A1_${i}`, bookId: 1000 + i },
            { title: `Книга A2_${i}`, bookId: 2000 + i },
            { title: `Книга A3_${i}`, bookId: 3000 + i },
          ],
          kryptoniteBook: { title: `Криптонит A_${i}`, bookId: 4000 + i },
          likedGenres: ["Классика", "Философия"],
          dislikedGenres: ["Боевик", "Комикс"],
          favoriteAuthors: ["Достоевский", "Толстой"],
          theme: "dark",
        };

        const profileB: ReadingDnaInput = {
          axes: axesB,
          favoriteBooks: [
            { title: `Книга B1_${i}`, bookId: 5000 + i },
            { title: `Книга B2_${i}`, bookId: 6000 + i },
            { title: `Книга B3_${i}`, bookId: 7000 + i },
          ],
          kryptoniteBook: { title: `Криптонит B_${i}`, bookId: 8000 + i },
          likedGenres: ["Боевик", "Комикс"],
          dislikedGenres: ["Классика", "Философия"],
          favoriteAuthors: ["Ли Чайлд", "Том Клэнси"],
          theme: "craft",
        };

        const res = calculateCompatibility(profileA, profileB);
        sum += res.compatibility;
      }

      const mean = sum / PAIRS_COUNT;
      expect(mean).toBeGreaterThanOrEqual(10);
      expect(mean).toBeLessThanOrEqual(25);
    });
  });

  describe("calculateCompatibility — чувствительность модели и граничные условия", () => {
    const baseAxes: DnaAxes = {
      storyFocus: 50,
      emotionalWeight: 50,
      pace: 50,
      darkness: 50,
      scope: 50,
      complexity: 50,
    };

    it("два одинаковых профиля с пустыми likedGenres, dislikedGenres, favoriteAuthors дают >= 90%", () => {
      const emptyA: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [
          { title: "Книга 1", bookId: 1 },
          { title: "Книга 2", bookId: 2 },
          { title: "Книга 3", bookId: 3 },
        ],
        kryptoniteBook: null,
        likedGenres: [],
        dislikedGenres: [],
        favoriteAuthors: [],
        theme: "dark",
      };

      const res = calculateCompatibility(emptyA, emptyA);
      expect(res.compatibility).toBeGreaterThanOrEqual(90);
    });

    it("профили с одинаковыми осями и нулевым пересечением книг дают >= 75%", () => {
      const profileA: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [
          { title: "Книга A1", bookId: 1 },
          { title: "Книга A2", bookId: 2 },
          { title: "Книга A3", bookId: 3 },
        ],
        kryptoniteBook: null,
        likedGenres: ["Фантастика"],
        dislikedGenres: ["Любовный роман"],
        favoriteAuthors: ["Автор A"],
        theme: "dark",
      };

      const profileB: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [
          { title: "Книга B1", bookId: 4 },
          { title: "Книга B2", bookId: 5 },
          { title: "Книга B3", bookId: 6 },
        ],
        kryptoniteBook: null,
        likedGenres: ["Фантастика"],
        dislikedGenres: ["Любовный роман"],
        favoriteAuthors: ["Автор A"],
        theme: "craft",
      };

      const res = calculateCompatibility(profileA, profileB);
      expect(res.compatibility).toBeGreaterThanOrEqual(75);
    });

    it("одна общая книга из трех дает прирост минимум на 3 п.п. («скачок Эврики»)", () => {
      const axesRealistic: DnaAxes = {
        storyFocus: 60,
        emotionalWeight: 65,
        pace: 45,
        darkness: 55,
        scope: 50,
        complexity: 60,
      };

      const profileBaseA: ReadingDnaInput = {
        axes: axesRealistic,
        favoriteBooks: [
          { title: "Книга 1", bookId: 1 },
          { title: "Книга 2", bookId: 2 },
          { title: "Книга 3", bookId: 3 },
        ],
        kryptoniteBook: null,
        likedGenres: ["Фантастика"],
        dislikedGenres: ["Любовный роман"],
        favoriteAuthors: ["Автор 1"],
        theme: "dark",
      };

      const profileZeroBooks: ReadingDnaInput = {
        axes: axesRealistic,
        favoriteBooks: [
          { title: "Книга 4", bookId: 4 },
          { title: "Книга 5", bookId: 5 },
          { title: "Книга 6", bookId: 6 },
        ],
        kryptoniteBook: null,
        likedGenres: ["Фантастика"],
        dislikedGenres: ["Любовный роман"],
        favoriteAuthors: ["Автор 2"],
        theme: "craft",
      };

      const profileOneSharedBook: ReadingDnaInput = {
        axes: axesRealistic,
        favoriteBooks: [
          { title: "Книга 1", bookId: 1 }, // 1 общая книга!
          { title: "Книга 5", bookId: 5 },
          { title: "Книга 6", bookId: 6 },
        ],
        kryptoniteBook: null,
        likedGenres: ["Фантастика"],
        dislikedGenres: ["Любовный роман"],
        favoriteAuthors: ["Автор 2"],
        theme: "craft",
      };

      const resZero = calculateCompatibility(profileBaseA, profileZeroBooks);
      const resOne = calculateCompatibility(profileBaseA, profileOneSharedBook);

      expect(resOne.compatibility - resZero.compatibility).toBeGreaterThanOrEqual(3);
    });

    it("общий криптонит — это общая антипатия (плюс), kryptoniteConflict === false", () => {
      const profileA: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [
          { title: "Книга A1", bookId: 1 },
          { title: "Книга A2", bookId: 2 },
        ],
        kryptoniteBook: { title: "Сумерки", bookId: 99 },
        likedGenres: ["Фантастика"],
        dislikedGenres: ["Ужасы"],
        favoriteAuthors: ["Автор A"],
        theme: "dark",
      };

      const profileBWithSameKryptonite: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [
          { title: "Книга B1", bookId: 3 },
          { title: "Книга B2", bookId: 4 },
        ],
        kryptoniteBook: { title: "Сумерки", bookId: 99 }, // тот же криптонит
        likedGenres: ["Фантастика"],
        dislikedGenres: ["Ужасы"],
        favoriteAuthors: ["Автор B"],
        theme: "craft",
      };

      const profileBWithDifferentKryptonite: ReadingDnaInput = {
        ...profileBWithSameKryptonite,
        kryptoniteBook: { title: "Другой криптонит", bookId: 100 },
      };

      const resSame = calculateCompatibility(profileA, profileBWithSameKryptonite);
      const resDiff = calculateCompatibility(profileA, profileBWithDifferentKryptonite);

      expect(resSame.breakdown.kryptoniteConflict).toBe(false);
      expect(resSame.compatibility).toBeGreaterThanOrEqual(resDiff.compatibility);
    });

    it("жанровый конфликт снижает совместимость", () => {
      const profileA: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [{ title: "Книга 1", bookId: 1 }],
        kryptoniteBook: null,
        likedGenres: ["Фэнтези"],
        dislikedGenres: [],
        favoriteAuthors: [],
        theme: "dark",
      };

      const profileWithoutConflict: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [{ title: "Книга 2", bookId: 2 }],
        kryptoniteBook: null,
        likedGenres: ["Детектив"],
        dislikedGenres: ["Ужасы"],
        favoriteAuthors: [],
        theme: "craft",
      };

      const profileWithConflict: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [{ title: "Книга 2", bookId: 2 }],
        kryptoniteBook: null,
        likedGenres: ["Детектив"],
        dislikedGenres: ["Фэнтези"], // ненавидит любимый жанр А
        favoriteAuthors: [],
        theme: "craft",
      };

      const resNoConflict = calculateCompatibility(profileA, profileWithoutConflict);
      const resConflict = calculateCompatibility(profileA, profileWithConflict);

      expect(resConflict.compatibility).toBeLessThan(resNoConflict.compatibility);
    });

    it("«святыня vs криптонит» отмечает kryptoniteConflict === true и штрафует, но > 0", () => {
      const profileA: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [
          { title: "1984", bookId: 1 },
          { title: "Мастер и Маргарита", bookId: 2 },
        ],
        kryptoniteBook: null,
        likedGenres: ["Классика"],
        dislikedGenres: [],
        favoriteAuthors: [],
        theme: "dark",
      };

      const profileConflict: ReadingDnaInput = {
        axes: { ...baseAxes },
        favoriteBooks: [{ title: "Другая", bookId: 3 }],
        kryptoniteBook: { title: "1984", bookId: 1 }, // Криптонит совпал со святыней А
        likedGenres: ["Классика"],
        dislikedGenres: [],
        favoriteAuthors: [],
        theme: "craft",
      };

      const profileNoConflict: ReadingDnaInput = {
        ...profileConflict,
        kryptoniteBook: { title: "Сумерки", bookId: 99 },
      };

      const resConflict = calculateCompatibility(profileA, profileConflict);
      const resNoConflict = calculateCompatibility(profileA, profileNoConflict);

      expect(resConflict.breakdown.kryptoniteConflict).toBe(true);
      expect(resConflict.compatibility).toBeLessThan(resNoConflict.compatibility);
      expect(resConflict.compatibility).toBeGreaterThan(0);
      expect(resConflict.verdict).toContain("Взрывоопасная смесь");
    });

    it("эффект Боссона: совпадение неприязненных жанров сближает сильнее, чем совпадение любимых жанров", () => {
      const axesDiff: DnaAxes = {
        storyFocus: 20,
        emotionalWeight: 30,
        pace: 70,
        darkness: 30,
        scope: 30,
        complexity: 40,
      };

      const profileBase: ReadingDnaInput = {
        axes: axesDiff,
        favoriteBooks: [],
        kryptoniteBook: null,
        likedGenres: ["Фантастика", "Детектив"],
        dislikedGenres: ["Любовный роман", "Ужасы"],
        favoriteAuthors: [],
        theme: "dark",
      };

      const profileSharedLikes: ReadingDnaInput = {
        axes: axesDiff,
        favoriteBooks: [],
        kryptoniteBook: null,
        likedGenres: ["Фантастика", "Детектив"], // 2 общих любимых
        dislikedGenres: ["Бизнес", "Кулинария"],
        favoriteAuthors: [],
        theme: "craft",
      };

      const profileSharedDislikes: ReadingDnaInput = {
        axes: axesDiff,
        favoriteBooks: [],
        kryptoniteBook: null,
        likedGenres: ["Бизнес", "Кулинария"],
        dislikedGenres: ["Любовный роман", "Ужасы"], // 2 общих неприязненных
        favoriteAuthors: [],
        theme: "craft",
      };

      const resLikes = calculateCompatibility(profileBase, profileSharedLikes);
      const resDislikes = calculateCompatibility(profileBase, profileSharedDislikes);

      // Вес dislikedGenres (0.1667) больше, чем likedGenres (0.0556),
      // поэтому при совпадении двух отвергаемых жанров совместимость выше минимум на 3 п.п.
      expect(resDislikes.compatibility - resLikes.compatibility).toBeGreaterThanOrEqual(3);
    });
  });
});
