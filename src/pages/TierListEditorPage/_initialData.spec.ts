import { describe, it, expect } from "vitest";
import { getTemplateInitialData } from "./_initialData";
import type { CreateTemplateData } from "@/types/templates";

const sampleTemplate: CreateTemplateData = {
  title: "Тестовый шаблон",
  tiers: [
    { id: "tier_s", name: "S", color: "#ef4444", order: 1 },
    { id: "tier_a", name: "A", color: "#f97316", order: 2 },
  ],
  defaultBooks: [
    {
      title: "Книга первая",
      author: "Автор 1",
      coverImageUrl: "/images/books/kniga-1.webp",
      defaultTierId: "tier_s",
    },
    {
      title: "Книга вторая",
      author: "Автор 2",
      coverImageUrl: "/images/books/kniga-2.webp",
      defaultTierId: "tier_a",
    },
  ],
};

describe("getTemplateInitialData", () => {
  it("создаёт тиры с префиксом tpl- и сохраняет порядок", () => {
    const data = getTemplateInitialData("new", sampleTemplate);

    expect(data.tierOrder).toEqual(["tpl-tier_s", "tpl-tier_a"]);
    expect(data.tiers["tpl-tier_s"]).toMatchObject({
      id: "tpl-tier_s",
      title: "S",
      color: "#ef4444",
      bookIds: [],
    });
    expect(data.tierIdToTempIdMap).toEqual({
      tier_s: "tpl-tier_s",
      tier_a: "tpl-tier_a",
    });
  });

  it("все книги попадают в «Книги без рейтинга» (пользователь распределяет сам)", () => {
    const data = getTemplateInitialData("new", sampleTemplate);

    expect(data.unrankedBookIds).toHaveLength(2);
    expect(data.tiers["tpl-tier_s"].bookIds).toHaveLength(0);
    expect(data.tiers["tpl-tier_a"].bookIds).toHaveLength(0);
  });

  it("заполняет данные книги (title, author, coverImageUrl)", () => {
    const data = getTemplateInitialData("new", sampleTemplate);

    const book = data.books[data.unrankedBookIds[0]];
    expect(book).toMatchObject({
      title: "Книга первая",
      author: "Автор 1",
      coverImageUrl: "/images/books/kniga-1.webp",
    });
  });
});
