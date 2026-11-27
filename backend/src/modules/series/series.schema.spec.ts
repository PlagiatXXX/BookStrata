import { describe, it, expect } from "vitest";
import {
  createSeriesSchema,
  updateSeriesSchema,
  listSeriesQuerySchema,
  slugifySeriesName,
} from "./series.schema.js";

describe("series.schema", () => {
  it("принимает валидный цикл", () => {
    const result = createSeriesSchema.safeParse({
      name: "Голодные игры",
      description: "Антиутопическая трилогия",
      authorId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет пустое название", () => {
    const result = createSeriesSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("позволяет частичное обновление в updateSeriesSchema", () => {
    const result = updateSeriesSchema.safeParse({ description: "Новое описание" });
    expect(result.success).toBe(true);
  });

  it("приводит параметры пагинации listSeriesQuerySchema", () => {
    const parsed = listSeriesQuerySchema.parse({ q: "ведьмак", page: "2", limit: "15" });
    expect(parsed).toEqual({ q: "ведьмак", page: 2, limit: 15 });
  });

  it("транслитерирует кириллицу в slugifySeriesName", () => {
    expect(slugifySeriesName("Голодные игры")).toBe("golodnye-igry");
    expect(slugifySeriesName("!!!")).toBe("series");
  });
});
