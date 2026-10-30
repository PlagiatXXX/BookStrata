import { describe, it, expect } from "vitest";
import { TAG_TO_CATEGORY } from "./tag-to-category";

describe("TAG_TO_CATEGORY mapping", () => {
  it("должен маппить точные теги", () => {
    expect(TAG_TO_CATEGORY["Фэнтези"]).toBe("fantasy");
    expect(TAG_TO_CATEGORY["Детективы"]).toBe("thriller");
    expect(TAG_TO_CATEGORY["Ужасы"]).toBe("horror");
    expect(TAG_TO_CATEGORY["Славянское фэнтези"]).toBe("slavic-fantasy");
  });

  it("должен поддерживать регистронезависимый поиск и тримминг", () => {
    expect(TAG_TO_CATEGORY["фэнтези"]).toBe("fantasy");
    expect(TAG_TO_CATEGORY["  детектив  "]).toBe("thriller");
    expect(TAG_TO_CATEGORY["КИБЕРПАНК".toLowerCase()]).toBe("cyberpunk");
    expect(TAG_TO_CATEGORY["научпоп"]).toBe("non-fiction");
  });

  it("должен возвращать undefined для ненайденных тегов", () => {
    expect(TAG_TO_CATEGORY["произвольный-несуществующий-тег"]).toBeUndefined();
  });
});
