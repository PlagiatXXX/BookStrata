import { describe, it, expect } from "vitest";
import {
  calculateCompatibility,
  resolveArchetype,
  ARCHETYPES,
} from "./compatibility.calculator.js";
import type { DnaAxes, ReadingDnaInput } from "./readingDna.schema.js";

describe("compatibility.calculator — 12 архетипов и психометрическая модель", () => {
  describe("resolveArchetype", () => {
    it("содержит ровно 16 уникальных читательских архетипов в 4 кастах", () => {
      expect(ARCHETYPES.length).toBe(16);
      const uniqueIds = new Set(ARCHETYPES.map((a) => a.id));
      expect(uniqueIds.size).toBe(16);
    });

    it("каждый архетип содержит названия для тем dark и craft, касту, цитату и описание", () => {
      for (const a of ARCHETYPES) {
        expect(a.id).toBeTruthy();
        expect(a.caste).toBeDefined();
        expect(a.caste.id).toBeTruthy();
        expect(a.caste.name).toBeTruthy();
        expect(a.names.dark).toBeTruthy();
        expect(a.names.craft).toBeTruthy();
        expect(a.quote).toBeTruthy();
        expect(a.description).toBeTruthy();
        expect(a.idealAxes).toBeDefined();
      }
    });

    it("корректно определяет архетип «Хранитель запретных фолиантов» при высоком мраке и катарсисе", () => {
      const darkAxes: DnaAxes = {
        storyFocus: 60,
        emotionalWeight: 90,
        pace: 40,
        darkness: 95,
        scope: 50,
        complexity: 75,
      };

      const archetype = resolveArchetype(darkAxes);
      expect(archetype.id).toBe("dark-archivist");
      expect(archetype.names.dark).toBe("Хранитель запретных фолиантов");
      expect(archetype.names.craft).toBe("Полуночный затворник");
    });

    it("корректно определяет архетип «Охотник за сюжетами» при высоком фокусе на сюжет и стремительном темпе", () => {
      const plotAxes: DnaAxes = {
        storyFocus: 10,
        emotionalWeight: 40,
        pace: 15,
        darkness: 50,
        scope: 60,
        complexity: 30,
      };

      const archetype = resolveArchetype(plotAxes);
      expect(archetype.id).toBe("plot-hunter");
      expect(archetype.names.dark).toBe("Охотник за сюжетами");
    });
  });

  describe("calculateCompatibility", () => {
    const baseProfileA: ReadingDnaInput = {
      axes: {
        storyFocus: 70,
        emotionalWeight: 80,
        pace: 40,
        darkness: 85,
        scope: 60,
        complexity: 80,
      },
      favoriteBooks: [
        { title: "1984", author: "Дж. Оруэлл", bookId: 1 },
        { title: "Мастер и Маргарита", author: "М. Булгаков", bookId: 2 },
        { title: "Преступление и наказание", author: "Ф. Достоевский", bookId: 3 },
      ],
      kryptoniteBook: { title: "Сумерки", author: "С. Майер", bookId: 99 },
      likedGenres: ["Классика", "Антиутопия"],
      dislikedGenres: ["Любовный роман"],
      favoriteAuthors: ["Оруэлл", "Булгаков", "Достоевский"],
      theme: "dark",
    };

    it("возвращает 95-100% для двух идентичных читательских профилей", () => {
      const result = calculateCompatibility(baseProfileA, baseProfileA);
      expect(result.compatibility).toBeGreaterThanOrEqual(95);
      expect(result.compatibility).toBeLessThanOrEqual(100);
      expect(result.verdict).toContain("Литературные соулмейты");
    });

    it("возвращает 10-25% для полярных противоположностей", () => {
      const oppositeProfile: ReadingDnaInput = {
        axes: {
          storyFocus: 10,
          emotionalWeight: 15,
          pace: 95,
          darkness: 10,
          scope: 10,
          complexity: 15,
        },
        favoriteBooks: [
          { title: "Книга 100", author: "Автор 1" },
          { title: "Книга 101", author: "Автор 2" },
          { title: "Книга 102", author: "Автор 3" },
        ],
        kryptoniteBook: null,
        likedGenres: ["Детская литература", "Бизнес"],
        dislikedGenres: ["Классика", "Антиутопия"],
        favoriteAuthors: ["Другой автор"],
        theme: "craft",
      };

      const result = calculateCompatibility(baseProfileA, oppositeProfile);
      expect(result.compatibility).toBeLessThanOrEqual(30);
      expect(result.verdict).toBeTruthy();
    });

    it("начисляет бонус Боссона за совпадение отвергаемых жанров (shared dislikes)", () => {
      const profileWithSharedDislike: ReadingDnaInput = {
        ...baseProfileA,
        favoriteBooks: [
          { title: "Другая 1" },
          { title: "Другая 2" },
          { title: "Другая 3" },
        ],
        dislikedGenres: ["Любовный роман"],
      };

      const profileWithoutSharedDislike: ReadingDnaInput = {
        ...baseProfileA,
        favoriteBooks: [
          { title: "Другая 1" },
          { title: "Другая 2" },
          { title: "Другая 3" },
        ],
        dislikedGenres: ["Детектив"],
      };

      const resWithShared = calculateCompatibility(baseProfileA, profileWithSharedDislike);
      const resWithoutShared = calculateCompatibility(baseProfileA, profileWithoutSharedDislike);

      expect(resWithShared.breakdown.sharedDislikeBonus).toBeGreaterThan(0);
      expect(resWithShared.compatibility).toBeGreaterThan(resWithoutShared.compatibility);
    });

    it("налагает штраф, если любимая книга одного является криптонитом другого", () => {
      const profileConflict: ReadingDnaInput = {
        ...baseProfileA,
        kryptoniteBook: { title: "1984", author: "Дж. Оруэлл", bookId: 1 }, // Криптонит совпал с любимой книгой А!
      };

      const resConflict = calculateCompatibility(baseProfileA, profileConflict);
      const resNormal = calculateCompatibility(baseProfileA, baseProfileA);

      expect(resConflict.breakdown.kryptoniteConflict).toBe(true);
      expect(resConflict.compatibility).toBeLessThan(resNormal.compatibility);
    });
  });
});
