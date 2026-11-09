import { describe, expect, it } from "vitest";
import {
  getAuthorAffiliateLink,
  getAffiliateLinks,
  buildChitaiGorodLink,
} from "./affiliateLinks";

describe("affiliateLinks (спящий режим)", () => {
  it("getAffiliateLinks возвращает пустой список, когда партнёрки неактивны", () => {
    const links = getAffiliateLinks({ title: "Война и мир", author: "Лев Толстой" });
    expect(links).toEqual([]);
  });

  it("getAuthorAffiliateLink возвращает пустой список, когда партнёрки неактивны", () => {
    const links = getAuthorAffiliateLink("Лев Толстой");
    expect(links).toEqual([]);
  });

  it("buildChitaiGorodLink сохраняет корректный формат ссылки на будущее", () => {
    const url = buildChitaiGorodLink("Война и мир Лев Толстой");
    expect(url).toContain("https://www.chitai-gorod.ru/search?");
    expect(url).toContain("partnerId=1006433");
    expect(new URL(url).searchParams.get("phrase")).toBe("Война и мир Лев Толстой");
  });
});
