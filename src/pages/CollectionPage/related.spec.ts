import { describe, expect, it } from "vitest";

import type { CollectionItem } from "@/types/collection";
import { pickRelatedCollections } from "./related";

function makeCollection(overrides: Partial<CollectionItem>): CollectionItem {
  return {
    id: Math.floor(Math.random() * 100000),
    slug: `slug-${Math.floor(Math.random() * 100000)}`,
    title: "Подборка",
    type: "curated",
    categoryId: null,
    tags: [],
    isPublished: true,
    coverImageUrl: "",
    bookCovers: [],
    isFeatured: false,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const current = makeCollection({
  slug: "current",
  title: "Текущая",
  categoryId: "fantasy",
  tags: ["Фэнтези", "Магия"],
  order: 1,
});

const sameCategory = makeCollection({
  slug: "cat-1",
  categoryId: "fantasy",
  tags: ["Другое"],
  order: 2,
});

const byTags = makeCollection({
  slug: "tags-1",
  categoryId: "horror",
  tags: ["Фэнтези", "Магия", "Тьма"],
  order: 3,
});

const byTagsWeak = makeCollection({
  slug: "tags-2",
  categoryId: "horror",
  tags: ["Магия"],
  order: 4,
});

const rest1 = makeCollection({
  slug: "rest-1",
  categoryId: null,
  tags: [],
  order: 5,
});

const rest2 = makeCollection({
  slug: "rest-2",
  categoryId: null,
  tags: [],
  order: 6,
});

describe("pickRelatedCollections", () => {
  it("исключает текущую коллекцию", () => {
    const result = pickRelatedCollections(current, [current, rest1, rest2]);
    expect(result.map((c) => c.slug)).not.toContain("current");
  });

  it("приоритет: категория → теги (по силе) → остальные по order", () => {
    const all = [current, sameCategory, byTags, byTagsWeak, rest1, rest2];
    const result = pickRelatedCollections(current, all);
    expect(result.map((c) => c.slug)).toEqual([
      "cat-1", // категория
      "tags-1", // 2 общих тега — сильнее
      "tags-2", // 1 общий тег
      "rest-1", // остальные по order
      "rest-2",
    ]);
  });

  it("не дублирует коллекции между уровнями", () => {
    const sameCategoryAlsoTagged = makeCollection({
      slug: "both",
      categoryId: "fantasy",
      tags: ["Фэнтези"],
      order: 2,
    });
    const result = pickRelatedCollections(current, [
      current,
      sameCategoryAlsoTagged,
      byTags,
    ]);
    expect(result.map((c) => c.slug)).toEqual(["both", "tags-1"]);
  });

  it("уважает лимит", () => {
    const all = [current, sameCategory, byTags, byTagsWeak, rest1, rest2];
    expect(pickRelatedCollections(current, all, 2).length).toBe(2);
    expect(pickRelatedCollections(current, all, 2).map((c) => c.slug)).toEqual([
      "cat-1",
      "tags-1",
    ]);
  });

  it("без категории и тегов работает только третий уровень", () => {
    const noCat = makeCollection({
      slug: "nobel-laureates",
      categoryId: null,
      tags: [],
      order: 10,
    });
    const result = pickRelatedCollections(noCat, [noCat, rest1, rest2]);
    expect(result.map((c) => c.slug)).toEqual(["rest-1", "rest-2"]);
  });

  it("не включает черновики", () => {
    const draft = makeCollection({ slug: "draft", isPublished: false });
    const result = pickRelatedCollections(current, [current, draft, rest1]);
    expect(result.map((c) => c.slug)).not.toContain("draft");
  });

  it("возвращает пустой массив, если кроме текущей никого нет", () => {
    expect(pickRelatedCollections(current, [current])).toEqual([]);
  });
});