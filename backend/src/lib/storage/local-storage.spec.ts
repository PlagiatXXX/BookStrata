import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Тестовый каталог вместо боевого ./uploads — путь вычисляется внутри фабрики мока
// (vi.mock hoisted, внешние const недоступны)
const TEST_DIR = join(tmpdir(), `bookstrata-storage-test-${process.pid}`);

vi.mock("../../config/env.js", () => ({
  config: {
    UPLOADS_DIR: join(tmpdir(), `bookstrata-storage-test-${process.pid}`),
    UPLOADS_BASE_URL: "/uploads",
    NODE_ENV: "test",
  },
}));

vi.mock("../logger.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { LocalStorage } from "./local-storage.js";

describe("LocalStorage.deleteFile: защита от path traversal", () => {
  let storage: LocalStorage;

  beforeEach(async () => {
    await fs.mkdir(join(TEST_DIR, "avatars"), { recursive: true });
    // Файл-мишень ВНЕ uploads-подкаталога — в корне TEST_DIR
    await fs.writeFile(join(TEST_DIR, "secret.txt"), Buffer.from("SECRET"));
    storage = new LocalStorage();
  });

  it("удаляет легитимный файл по publicId", async () => {
    await fs.writeFile(join(TEST_DIR, "avatars", "legit.webp"), Buffer.from("x"));
    await expect(storage.deleteFile("/uploads/avatars/legit.webp")).resolves.not.toThrow();
    await expect(fs.access(join(TEST_DIR, "avatars", "legit.webp"))).rejects.toThrow();
  });

  it("НЕ удаляет файл вне UPLOADS_DIR при ../ в publicId", async () => {
    await storage.deleteFile("/uploads/../secret.txt");
    const content = await fs.readFile(join(TEST_DIR, "secret.txt"), "utf-8");
    expect(content).toBe("SECRET");
  });

  it("НЕ удаляет файл при глубоком traversal (../../)", async () => {
    await storage.deleteFile("/uploads/../../secret.txt");
    const content = await fs.readFile(join(TEST_DIR, "secret.txt"), "utf-8");
    expect(content).toBe("SECRET");
  });

  it("молча игнорирует абсолютные/сторонние пути", async () => {
    await expect(storage.deleteFile("/uploads//etc/passwd")).resolves.not.toThrow();
    await expect(storage.deleteFile("https://evil.com/x.png")).resolves.not.toThrow();
  });
});

afterAll(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
});
