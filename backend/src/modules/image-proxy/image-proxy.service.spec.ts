// backend/src/modules/image-proxy/image-proxy.service.spec.ts
// Прокси картинок: S3 замокан, fetch глобально — проверяем обработку
// Content-Type (литрес и другие CDN отдают картинки без заголовка).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send() {
      throw new Error("s3 не вызывается в этих тестах");
    }
  },
  HeadObjectCommand: class {},
  PutObjectCommand: class {},
  S3ServiceException: class extends Error {},
}));

import { getWebP, isAllowedUrl } from "./image-proxy.service.js";

// 1x1 прозрачный PNG
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("isAllowedUrl (белый список)", () => {
  it("api.bookmate.ru разрешён (обложки Bookmate)", () => {
    expect(
      isAllowedUrl(
        "https://api.bookmate.ru/assets/books-covers/60/6d/UCwSEfoP-ipad.jpeg?image_hash=abc",
      ),
    ).toBe(true);
  });

  it("поддомены разрешённых доменов проходят", () => {
    expect(isAllowedUrl("https://cdn1.litres.ru/pub/c/cover_415/1")).toBe(true);
  });

  it("неизвестный домен блокируется", () => {
    expect(isAllowedUrl("https://evil.example.com/x.jpg")).toBe(false);
  });

  // ── Bypass attempts ──

  it("блокирует javascript: протокол", () => {
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
  });

  it("блокирует file: протокол", () => {
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
  });

  it("блокирует ftp: протокол", () => {
    expect(isAllowedUrl("ftp://m.media-amazon.com/x.jpg")).toBe(false);
  });

  it("блокирует data: URI", () => {
    expect(isAllowedUrl("data:image/png;base64,abc")).toBe(false);
  });

  it("блокирует подмену поддомена (evil-m.media-amazon.com)", () => {
    expect(isAllowedUrl("https://evil-m.media-amazon.com/x.jpg")).toBe(false);
  });

  it("блокирует подмену домена в пути (media-amazon.com.evil.com)", () => {
    expect(isAllowedUrl("https://media-amazon.com.evil.com/x.jpg")).toBe(false);
  });

  it("разрешает URL с портом (hostname не включает порт)", () => {
    expect(isAllowedUrl("https://m.media-amazon.com:8080/x.jpg")).toBe(true);
  });

  it("пустая строка → false", () => {
    expect(isAllowedUrl("")).toBe(false);
  });

  it("невалидный URL → false", () => {
    expect(isAllowedUrl("not-a-url")).toBe(false);
  });

  it("URL с @ в userinfo (попытка подмены) → hostname корректен", () => {
    // https://evil.com@m.media-amazon.com — hostname = m.media-amazon.com (OK)
    expect(isAllowedUrl("https://evil.com@m.media-amazon.com/x.jpg")).toBe(true);
    // https://m.media-amazon.com@evil.com — hostname = evil.com (blocked)
    expect(isAllowedUrl("https://m.media-amazon.com@evil.com/x.jpg")).toBe(false);
  });
});

describe("ImageProxy getWebP", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("скачивает и конвертирует картинку без Content-Type (литрес-кейс)", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array(PNG_1PX), { status: 200 }),
    );

    const { buffer, s3Url } = await getWebP(
      "https://cdn.litres.ru/pub/c/cover_415/58887294",
      300,
      80,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.litres.ru/pub/c/cover_415/58887294",
      expect.objectContaining({ redirect: "follow" }),
    );
    // Пустой content-type → конвертация прошла, buffer отдан
    expect(buffer.length).toBeGreaterThan(0);
    // WebP magic bytes (RIFF....WEBP)
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(buffer.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(s3Url).toBeNull();
  });

  it("обычный image/jpeg конвертируется как раньше", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array(PNG_1PX), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      }),
    );

    const { buffer } = await getWebP("https://m.media-amazon.com/cover.jpg");

    expect(buffer.length).toBeGreaterThan(0);
  });

  it("явный не-image content-type (HTML-капча) → ошибка", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>captcha</html>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    );

    await expect(
      getWebP("https://example.com/blocked"),
    ).rejects.toThrow("Non-image content type: text/html; charset=utf-8");
  });

  it("не-200 от origin → ошибка", async () => {
    fetchMock.mockResolvedValue(new Response("not found", { status: 404 }));

    await expect(getWebP("https://example.com/gone")).rejects.toThrow(
      "Failed to fetch https://example.com/gone: 404",
    );
  });
});