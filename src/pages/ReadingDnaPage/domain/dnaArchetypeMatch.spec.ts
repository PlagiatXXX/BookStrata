import { describe, it, expect } from "vitest";
import {
  findArchetypeByIdOrName,
  resolveArchetypeByRanges,
} from "./dnaArchetypeMatch";
import type { DnaArchetypeCatalogItem } from "@/lib/readingDnaApi";

describe("dnaArchetypeMatch", () => {
  const sampleItems: DnaArchetypeCatalogItem[] = [
    {
      id: "meaning-architect",
      number: 1,
      caste: { id: "mind", name: "Орден Смыслов", sealColor: "#c0c0c8", badgeClass: "" },
      rarity: 7,
      names: { dark: "Архитектор смыслов", craft: "Искатель сути" },
      description: "Интеллектуальная проза",
      quote: "Цитата",
      specialSign: "Знак",
      axisRanges: {
        storyFocus: { min: 78, max: 100 },
        emotionalWeight: { min: 68, max: 92 },
        pace: { min: 63, max: 87 },
        darkness: { min: 48, max: 72 },
        scope: { min: 63, max: 87 },
        complexity: { min: 78, max: 100 },
      },
    },
    {
      id: "dark-archivist",
      number: 5,
      caste: { id: "abyss", name: "Орден Бездны", sealColor: "#8a2433", badgeClass: "" },
      rarity: 7,
      names: { dark: "Хранитель запретных фолиантов", craft: "Полуночный затворник" },
      description: "Темная классика",
      quote: "Цитата",
      specialSign: "Знак",
      axisRanges: {
        storyFocus: { min: 53, max: 77 },
        emotionalWeight: { min: 73, max: 97 },
        pace: { min: 33, max: 57 },
        darkness: { min: 78, max: 100 },
        scope: { min: 43, max: 67 },
        complexity: { min: 63, max: 87 },
      },
    },
  ];

  describe("findArchetypeByIdOrName", () => {
    it("находит по id", () => {
      const arch = findArchetypeByIdOrName(sampleItems, "meaning-architect");
      expect(arch?.id).toBe("meaning-architect");
    });

    it("находит по названию dark", () => {
      const arch = findArchetypeByIdOrName(sampleItems, "Архитектор смыслов");
      expect(arch?.id).toBe("meaning-architect");
    });

    it("находит по названию craft", () => {
      const arch = findArchetypeByIdOrName(sampleItems, "Полуночный затворник");
      expect(arch?.id).toBe("dark-archivist");
    });

    it("возвращает undefined для несуществующего имени", () => {
      const arch = findArchetypeByIdOrName(sampleItems, "Неизвестный");
      expect(arch).toBeUndefined();
    });
  });

  describe("resolveArchetypeByRanges", () => {
    it("разрешает dark-archivist при попадании во все диапазоны", () => {
      const arch = resolveArchetypeByRanges(sampleItems, {
        storyFocus: 65,
        emotionalWeight: 85,
        pace: 45,
        darkness: 90,
        scope: 55,
        complexity: 75,
      });
      expect(arch?.id).toBe("dark-archivist");
    });
  });
});
