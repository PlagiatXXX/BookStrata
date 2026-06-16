import { describe, it, expect } from "vitest";
import { validateImageSize } from "./validators.js";

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
