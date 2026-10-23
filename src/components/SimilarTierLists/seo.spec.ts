import { describe, it, expect } from "vitest";
import { buildSimilarTierListsJsonLd } from "./seo";
import type { TierListShort } from "@/lib/tierListApi";

const base: TierListShort = {
  id: "tl-1",
  slug: "my-list-a1b2c3",
  title: "Мои любимые книги",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  isPublic: true,
  coverImageUrl: "https://example.com/cover.webp",
  authorName: "Иван",
  likesCount: 5,
  booksCount: 10,
};

describe("buildSimilarTierListsJsonLd", () => {
  it("возвращает null для пустого массива", () => {
    expect(buildSimilarTierListsJsonLd([])).toBeNull();
  });

  it("строит ItemList с ListItem/Article", () => {
    const ld = buildSimilarTierListsJsonLd([base]) as any;
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.name).toBe("Похожие тир-листы");
    expect(ld.numberOfItems).toBe(1);
    const item = ld.itemListElement[0];
    expect(item["@type"]).toBe("ListItem");
    expect(item.position).toBe(1);
    expect(item.item["@type"]).toBe("Article");
    expect(item.item.name).toBe("Мои любимые книги");
    expect(item.item.url).toContain("/tier-lists/my-list-a1b2c3");
    expect(item.item.image).toBe("https://example.com/cover.webp");
    expect(item.item.author.name).toBe("Иван");
  });

  it("использует id если slug отсутствует", () => {
    const ld = buildSimilarTierListsJsonLd([{ ...base, slug: null }]) as any;
    expect(ld.itemListElement[0].item.url).toContain("/tier-lists/tl-1");
  });
});