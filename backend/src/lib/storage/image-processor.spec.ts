// backend/src/lib/storage/image-processor.spec.ts
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { prepareImage, MAX_IMAGE_WIDTH } from "./image-processor.js";

async function makePngBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .png()
    .toBuffer();
}

describe("prepareImage", () => {
  it("уменьшает широкую картинку до MAX_IMAGE_WIDTH", async () => {
    const source = await makePngBuffer(4000, 2000);
    const { buffer, contentType } = await prepareImage(source);

    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(MAX_IMAGE_WIDTH);
    expect(meta.format).toBe("webp");
    expect(contentType).toBe("image/webp");
  });

  it("не увеличивает маленькую картинку", async () => {
    const source = await makePngBuffer(800, 600);
    const { buffer } = await prepareImage(source);

    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(800);
  });

  it("возвращает исходный буфер для битого файла", async () => {
    const junk = Buffer.from("this is not an image");
    const { buffer, contentType } = await prepareImage(junk);

    expect(buffer).toBe(junk);
    expect(contentType).toBe("image/png");
  });
});