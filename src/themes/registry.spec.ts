import { describe, expect, it } from "vitest";
import { getThemeById, listThemes } from "./registry";

describe("theme registry", () => {
  it("makes the Halloween collection theme available by id and in the admin theme list", () => {
    expect(getThemeById("halloween")).toMatchObject({
      id: "halloween",
      name: "Хэллоуин",
      sections: [],
    });
    expect(listThemes()).toContainEqual({ id: "halloween", name: "Хэллоуин" });
  });
});
