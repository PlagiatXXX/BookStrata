import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    NSFW_CHECK_ENABLED: true,
    NSFW_THRESHOLD: 0.8,
  },
  decodeImage: vi.fn(),
  classify: vi.fn(),
  load: vi.fn(),
}));

vi.mock("../config/env.js", () => ({ config: mocks.config }));

vi.mock("@tensorflow/tfjs-node", () => ({
  node: { decodeImage: mocks.decodeImage },
}));

vi.mock("nsfwjs/core", () => ({ load: mocks.load }));

vi.mock("nsfwjs/models/mobilenet_v2", () => ({ MobileNetV2Model: {} }));

// Реальный логгер создаёт файлы в LOG_DIR при импорте — в тестах не нужен
vi.mock("./logger.js", () => ({
  createLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn(), log: vi.fn() }),
}));

import {
  assertImageAllowed,
  base64DataToBuffer,
  checkImageBuffer,
} from "./nsfw-check.js";

const IMG = Buffer.from("fake-image-bytes");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.NSFW_CHECK_ENABLED = true;
  mocks.config.NSFW_THRESHOLD = 0.8;
  mocks.decodeImage.mockReturnValue({ dispose: vi.fn() });
  mocks.load.mockResolvedValue({ classify: mocks.classify });
});

describe("checkImageBuffer", () => {
  it("кэширует модель: повторные вызовы не грузят её заново", async () => {
    mocks.classify.mockResolvedValue([{ className: "Neutral", probability: 1 }]);
    await checkImageBuffer(IMG);
    await checkImageBuffer(IMG);
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });

  it("возвращает isNsfw=false, когда проверка отключена", async () => {
    mocks.config.NSFW_CHECK_ENABLED = false;
    const result = await checkImageBuffer(IMG);
    expect(result.isNsfw).toBe(false);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("блокирует Porn выше порога", async () => {
    mocks.classify.mockResolvedValue([
      { className: "Porn", probability: 0.95 },
      { className: "Neutral", probability: 0.05 },
    ]);
    const result = await checkImageBuffer(IMG);
    expect(result.isNsfw).toBe(true);
    expect(result.className).toBe("Porn");
    expect(result.probability).toBe(0.95);
  });

  it("блокирует Hentai выше порога", async () => {
    mocks.classify.mockResolvedValue([
      { className: "Hentai", probability: 0.91 },
      { className: "Drawing", probability: 0.09 },
    ]);
    const result = await checkImageBuffer(IMG);
    expect(result.isNsfw).toBe(true);
    expect(result.className).toBe("Hentai");
  });

  it("пропускает Neutral с высокой вероятностью", async () => {
    mocks.classify.mockResolvedValue([
      { className: "Porn", probability: 0.1 },
      { className: "Neutral", probability: 0.9 },
    ]);
    const result = await checkImageBuffer(IMG);
    expect(result.isNsfw).toBe(false);
  });

  it("пропускает NSFW-классы ниже порога", async () => {
    mocks.classify.mockResolvedValue([
      { className: "Porn", probability: 0.5 },
      { className: "Sexy", probability: 0.5 },
    ]);
    const result = await checkImageBuffer(IMG);
    expect(result.isNsfw).toBe(false);
  });

  it("safe-open: при ошибке декодирования не блокирует загрузку", async () => {
    mocks.decodeImage.mockImplementation(() => {
      throw new Error("decode failed");
    });
    const result = await checkImageBuffer(IMG);
    expect(result.isNsfw).toBe(false);
  });

  it("safe-open: при сбое загрузки модели не блокирует загрузку", async () => {
    mocks.load.mockRejectedValue(new Error("model failed"));
    const result = await checkImageBuffer(IMG);
    expect(result.isNsfw).toBe(false);
  });

  it("освобождает тензор после проверки", async () => {
    const dispose = vi.fn();
    mocks.decodeImage.mockReturnValue({ dispose });
    mocks.classify.mockResolvedValue([
      { className: "Neutral", probability: 1 },
    ]);
    await checkImageBuffer(IMG);
    expect(dispose).toHaveBeenCalled();
  });
});

describe("assertImageAllowed", () => {
  it("возвращает сообщение об ошибке для NSFW-картинки", async () => {
    mocks.classify.mockResolvedValue([
      { className: "Porn", probability: 0.99 },
      { className: "Neutral", probability: 0.01 },
    ]);
    const error = await assertImageAllowed("data:image/png;base64,AA==");
    expect(error).toContain("NSFW-контент");
  });

  it("возвращает null для чистой картинки", async () => {
    mocks.classify.mockResolvedValue([
      { className: "Neutral", probability: 0.99 },
      { className: "Porn", probability: 0.01 },
    ]);
    const error = await assertImageAllowed("data:image/png;base64,AA==");
    expect(error).toBeNull();
  });
});

describe("base64DataToBuffer", () => {
  it("срезает data-url префикс", () => {
    const buf = base64DataToBuffer("data:image/png;base64,aGVsbG8=");
    expect(buf.toString()).toBe("hello");
  });

  it("работает и без префикса", () => {
    const buf = base64DataToBuffer("aGVsbG8=");
    expect(buf.toString()).toBe("hello");
  });
});
