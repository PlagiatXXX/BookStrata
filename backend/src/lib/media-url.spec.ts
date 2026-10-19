// backend/src/lib/media-url.spec.ts
// Публичный URL файла из нашего хранилища: единый медиа-префикс
// (раздача через собственный домен вместо CDN).
import { describe, it, expect, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  config: { MEDIA_PUBLIC_URL: "https://bookstrata.ru/img" },
}));

import { mediaUrl } from "./media-url.js";

describe("mediaUrl", () => {
  it("собирает URL от медиа-префикса", () => {
    expect(mediaUrl("tiermaker-pro/covers/a.webp")).toBe(
      "https://bookstrata.ru/img/tiermaker-pro/covers/a.webp",
    );
  });

  it("срезает ведущий слэш у ключа", () => {
    expect(mediaUrl("/a.webp")).toBe("https://bookstrata.ru/img/a.webp");
  });
});
