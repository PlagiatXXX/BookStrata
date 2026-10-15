// src/pages/CollectionsPage/groupCollections.spec.ts
import { describe, it, expect } from "vitest";
import { groupCollections } from "./groupCollections";
import type { CollectionItem } from "@/types/collection";

const CATS = [
  { id: "horror", label: "Хоррор и мистика" },
  { id: "fantasy", label: "Фэнтези" },
];

const item = (id: number, categoryId?: string | null): CollectionItem =>
  ({ id, slug: `c-${id}`, title: `Подборка ${id}`, categoryId,
     type: "curated", isPublished: true, order: id, isFeatured: false,
     coverImageUrl: "", tags: [], createdAt: "", updatedAt: "" }) as CollectionItem;

describe("groupCollections", () => {
  it("распределяет по группам в порядке categories и сохраняет внутренний порядок", () => {
    const { groups, rest } = groupCollections([item(1, "fantasy"), item(2, "horror"), item(3, "fantasy")], CATS);
    expect(groups.map((g) => g.id)).toEqual(["horror", "fantasy"]); // horror первая — порядок categories
    expect(rest).toHaveLength(0);
    expect(groups[1].items.map((i) => i.id)).toEqual([1, 3]); // порядок входного массива
  });

  it("убирает полностью пустые группы", () => {
    const { groups } = groupCollections([item(1, "horror")], CATS);
    expect(groups.map((g) => g.id)).toEqual(["horror"]);
  });

  it("собирает в rest подборки без categoryId и с неизвестным categoryId", () => {
    const { groups, rest } = groupCollections(
      [item(1, "horror"), item(2, null), item(3, undefined), item(4, "sports")], CATS);
    expect(groups).toHaveLength(1);
    expect(rest.map((i) => i.id)).toEqual([2, 3, 4]);
  });

  it("rest пустой — группы без хвостовой секции (rest = [])", () => {
    const { rest } = groupCollections([item(1, "horror")], CATS);
    expect(rest).toEqual([]);
  });

  it("label берётся из categories, а не из данных", () => {
    const { groups } = groupCollections([item(1, "horror")], CATS);
    expect(groups[0].label).toBe("Хоррор и мистика");
  });

  it("пустой вход — пустой результат", () => {
    expect(groupCollections([], CATS)).toEqual({ groups: [], rest: [] });
  });
});
