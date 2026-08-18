import { describe, it, expect, vi, afterEach } from "vitest";
import sharp from "sharp";
import { validateImageSize, validateRemoteImageDimensions } from "./validators.js";

describe("validateImageSize", () => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

  it("пропускает не-base64 строки (URL)", () => {
    expect(validateImageSize("https://example.com/image.jpg")).toBeNull();
  });

  it("пропускает пустую строку", () => {
    expect(validateImageSize("")).toBeNull();
  });

  it("возвращает ошибку для некорректного data URL", () => {
    expect(validateImageSize("data:")).toBe("Некорректный data URL");
    expect(validateImageSize("data:image/png;base64,")).toBe("Некорректный data URL");
  });

  it("пропускает маленькое изображение", () => {
    // 1x1 pixel PNG base64 — примерно 70 байт
    const smallPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    expect(validateImageSize(smallPng)).toBeNull();
  });

  it("пропускает изображение ровно в 5MB", () => {
    // Создаём base64 строку, которая декодируется ровно в MAX_SIZE байт
    const size = MAX_SIZE;
    const rawBytes = Buffer.alloc(size, 0x61); // 'a' * size
    const base64 = rawBytes.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    expect(validateImageSize(dataUrl, MAX_SIZE)).toBeNull();
  });

  it("возвращает ошибку для изображения больше 5MB", () => {
    const size = MAX_SIZE + 1;
    const rawBytes = Buffer.alloc(size, 0x61);
    const base64 = rawBytes.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    expect(validateImageSize(dataUrl, MAX_SIZE)).toBe(
      "Размер изображения превышает лимит 5MB",
    );
  });

  it("учитывает кастомный лимит", () => {
    const rawBytes = Buffer.alloc(6 * 1024 * 1024 + 1, 0x61); // > 6 MB
    const base64 = rawBytes.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    expect(validateImageSize(dataUrl, 6 * 1024 * 1024)).toBe(
      "Размер изображения превышает лимит 6MB",
    );
  });
});

describe("validateRemoteImageDimensions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function pngBuffer(width: number, height: number): Promise<Buffer> {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 120, g: 80, b: 40 },
      },
    })
      .png()
      .toBuffer();
  }

  function stubFetch(
    buffer: Buffer,
    options: { ok?: boolean; contentType?: string } = {},
  ) {
    const { ok = true, contentType = "image/png" } = options;
    const fetchMock = vi.fn().mockResolvedValue({
      ok,
      headers: new Headers({ "content-type": contentType }),
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("пропускает локальные пути, data URL и свой CDN без запроса", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(validateRemoteImageDimensions("/images/cover.jpg")).resolves.toBeNull();
    await expect(validateRemoteImageDimensions("data:image/png;base64,AA==")).resolves.toBeNull();
    await expect(validateRemoteImageDimensions("https://cdn.twcstorage.ru/x.webp")).resolves.toBeNull();
    await expect(validateRemoteImageDimensions("")).resolves.toBeNull();
    await expect(validateRemoteImageDimensions("ftp://example.com/x.jpg")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("пропускает большую картинку (800×1200)", async () => {
    const buffer = await pngBuffer(800, 1200);
    const fetchMock = stubFetch(buffer);

    await expect(validateRemoteImageDimensions("https://example.com/large.jpg")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("блокирует маленькую картинку (100×150) с текстом ошибки", async () => {
    const buffer = await pngBuffer(100, 150);
    stubFetch(buffer);

    const error = await validateRemoteImageDimensions("https://example.com/small.jpg");
    expect(error).toContain("100×150");
    expect(error).toContain("Минимум 390×590");
  });

  it("пропускает картинку ровно на пороге (390×590)", async () => {
    const buffer = await pngBuffer(390, 590);
    stubFetch(buffer);

    await expect(
      validateRemoteImageDimensions("https://example.com/edge.jpg"),
    ).resolves.toBeNull();
  });

  it("блокирует картинку чуть меньше порога (389×589)", async () => {
    const buffer = await pngBuffer(389, 589);
    stubFetch(buffer);

    const error = await validateRemoteImageDimensions("https://example.com/small2.jpg");
    expect(error).toContain("389×589");
    expect(error).toContain("Минимум 390×590");
  });

  it("учитывает кастомный порог", async () => {
    const buffer = await pngBuffer(300, 400);
    stubFetch(buffer);

    // 300×400 — мало для 390×590, но проходит для 250×350
    await expect(
      validateRemoteImageDimensions("https://example.com/mid.jpg", 250, 350),
    ).resolves.toBeNull();
    const error = await validateRemoteImageDimensions("https://example.com/mid.jpg", 390, 590);
    expect(error).toContain("Минимум 390×590");
  });

  it("кэширует результат — повторная проверка не качает картинку", async () => {
    const buffer = await pngBuffer(800, 1200);
    const fetchMock = stubFetch(buffer);

    await validateRemoteImageDimensions("https://example.com/cached.jpg");
    await validateRemoteImageDimensions("https://example.com/cached.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("пропускает картинку при сетевой ошибке (не блокируем сохранение)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );

    await expect(validateRemoteImageDimensions("https://example.com/down.jpg")).resolves.toBeNull();
  });

  it("пропускает при HTTP-ошибке и не-image content type", async () => {
    const buffer = await pngBuffer(800, 1200);
    stubFetch(buffer, { ok: false });
    await expect(validateRemoteImageDimensions("https://example.com/404.jpg")).resolves.toBeNull();

    stubFetch(buffer, { contentType: "text/html" });
    await expect(validateRemoteImageDimensions("https://example.com/html.jpg")).resolves.toBeNull();
  });

  it("пропускает битый файл, который не читается sharp'ом", async () => {
    stubFetch(Buffer.from("not an image at all"));
    await expect(validateRemoteImageDimensions("https://example.com/broken.jpg")).resolves.toBeNull();
  });
});
