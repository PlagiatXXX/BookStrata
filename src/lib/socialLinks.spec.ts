import { describe, it, expect } from "vitest";
import { normalizeSocialUrl, getPlatformPlaceholder } from "./socialLinks";

describe("normalizeSocialUrl", () => {
  it("принимает ссылку со схемой", () => {
    expect(normalizeSocialUrl("https://t.me/user")).toBe("https://t.me/user");
  });

  it("добавляет https://, если схемы нет", () => {
    expect(normalizeSocialUrl("t.me/user")).toBe("https://t.me/user");
    expect(normalizeSocialUrl("vk.com/id666")).toBe("https://vk.com/id666");
  });

  it("поддерживает http://", () => {
    expect(normalizeSocialUrl("http://example.com")).toBe("http://example.com/");
  });

  it("отклоняет произвольный текст", () => {
    expect(normalizeSocialUrl("произвольный текст")).toBeNull();
    expect(normalizeSocialUrl("фыва")).toBeNull();
  });

  it("отклоняет пустые строки", () => {
    expect(normalizeSocialUrl("")).toBeNull();
    expect(normalizeSocialUrl("   ")).toBeNull();
  });

  it("отклоняет не-http протоколы", () => {
    expect(normalizeSocialUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSocialUrl("mailto:test@example.com")).toBeNull();
  });

  it("отклоняет строку без домена", () => {
    expect(normalizeSocialUrl("https://фыва")).toBeNull();
  });

  it("отклоняет ссылки с логином в URL (userinfo)", () => {
    expect(normalizeSocialUrl("mailto:test@example.com")).toBeNull();
    expect(normalizeSocialUrl("https://user:pass@example.com")).toBeNull();
  });
});

describe("getPlatformPlaceholder", () => {
  it("возвращает пример для известной платформы", () => {
    expect(getPlatformPlaceholder("telegram")).toBe("https://t.me/username");
  });

  it("возвращает дефолт для неизвестной платформы", () => {
    expect(getPlatformPlaceholder("foo")).toBe("https://example.com");
  });
});