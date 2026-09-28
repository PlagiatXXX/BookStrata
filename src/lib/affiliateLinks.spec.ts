import { describe, expect, it } from "vitest";
import { getAuthorAffiliateLink, getAffiliateLinks } from "./affiliateLinks";

describe("getAffiliateLinks (книга — существующее поведение)", () => {
  it("ссылка Читай-город с названием и автором", () => {
    const links = getAffiliateLinks({ title: "Война и мир", author: "Лев Толстой" });
    const [link] = links;
    expect(link.name).toBe("Читай-город");
    expect(new URL(link.url).searchParams.get("phrase")).toBe("Война и мир Лев Толстой");
    expect(link.url).toContain("partnerId=1006433");
    expect(link.disclaimer).toContain("Реклама");
  });
});

describe("getAuthorAffiliateLink (страница автора)", () => {
  it("одна ссылка Читай-город: phrase = имя автора, partnerId на месте", () => {
    const links = getAuthorAffiliateLink("Лев Толстой");
    expect(links).toHaveLength(1);
    const [link] = links;
    expect(link.name).toBe("Читай-город");
    expect(link.iconName).toBe("chitai-gorod");
    expect(link.url).toContain("https://www.chitai-gorod.ru/search?");
    expect(new URL(link.url).searchParams.get("phrase")).toBe("Лев Толстой");
    expect(link.url).toContain("partnerId=1006433");
    expect(link.disclaimer).toContain("Реклама");
    expect(link.disclaimer).toContain("partner ID: 1006433");
  });

  it("имя с кириллицей и спецсимволами корректно кодируется", () => {
    const [link] = getAuthorAffiliateLink("О'Брайен & сын");
    expect(link.url).toContain("phrase=");
    expect(link.url).not.toContain(" ");
    expect(new URL(link.url).searchParams.get("phrase")).toBe("О'Брайен & сын");
  });
});
