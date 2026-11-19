import { describe, expect, it } from "vitest";

import type { TierListData } from "@/types";
import { buildTierListJsonLd } from "./buildTierListJsonLd";

function makeListData(overrides: Partial<TierListData> = {}): TierListData {
  return {
    id: "1",
    title: "Тест",
    tiers: {
      t1: { id: "t1", title: "S", bookIds: ["b1", "b2"], color: "#fff" },
    },
    tierOrder: ["t1"],
    books: {
      b1: { id: "b1", title: "Книга 1", author: "Автор 1", coverImageUrl: "img1", description: "desc1" },
      b2: { id: "b2", title: "Книга 2", author: null, coverImageUrl: null, description: null },
    },
    unrankedBookIds: [],
    ...overrides,
  } as TierListData;
}

describe("buildTierListJsonLd", () => {
  it("возвращает null для пустого списка (нет книг)", () => {
    const data = makeListData({ books: {}, tiers: { t1: { id: "t1", title: "S", bookIds: [], color: "#fff" } } });
    expect(buildTierListJsonLd(data, { title: "Тест" }, "test-slug")).toBeNull();
  });

  it("возвращает null при отсутствии apiData", () => {
    const data = makeListData();
    expect(buildTierListJsonLd(data, null, "test-slug")).toBeNull();
  });

  it("строит ItemList с корректными полями", () => {
    const data = makeListData();
    const result = buildTierListJsonLd(data, { title: "Мой тир-лист", user: { username: "fedora", id: 42 } }, "my-slug") as any;

    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("ItemList");
    expect(result.name).toBe("Мой тир-лист");
    expect(result.url).toBe("https://bookstrata.ru/tier-lists/my-slug");
    expect(result.author).toEqual({
      "@type": "Person",
      name: "fedora",
      url: "https://bookstrata.ru/users/42",
    });
  });

  it("нумерует ListItem сквозной нумерацией 1..N", () => {
    const data = makeListData({
      tiers: {
        t1: { id: "t1", title: "S", bookIds: ["b1"], color: "#fff" },
        t2: { id: "t2", title: "A", bookIds: ["b2"], color: "#fff" },
      },
      tierOrder: ["t1", "t2"],
    });
    const result = buildTierListJsonLd(data, { title: "Тест" }, "slug") as any;
    expect(result.itemListElement).toHaveLength(2);
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[1].position).toBe(2);
  });

  it("не включает position в Book (невалидное поле)", () => {
    const data = makeListData();
    const result = buildTierListJsonLd(data, { title: "Тест" }, "slug") as any;
    expect(result.itemListElement[0].item.position).toBeUndefined();
  });

  it("включает image и description только если есть", () => {
    const data = makeListData();
    const result = buildTierListJsonLd(data, { title: "Тест" }, "slug") as any;
    const first = result.itemListElement[0].item;
    const second = result.itemListElement[1].item;
    expect(first.image).toBe("img1");
    expect(first.description).toBe("desc1");
    expect(second.image).toBeUndefined();
    expect(second.description).toBeUndefined();
  });

  it("возвращает null если itemListElement пуст", () => {
    const data = makeListData({
      tiers: {
        t1: { id: "t1", title: "S", bookIds: ["missing"], color: "#fff" },
      },
    });
    expect(buildTierListJsonLd(data, { title: "Тест" }, "slug")).toBeNull();
  });
});
