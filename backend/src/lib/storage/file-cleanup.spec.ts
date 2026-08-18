// backend/src/lib/storage/file-cleanup.spec.ts
// Очистка осиротевших файлов обложек: извлечение key из URL,
// проверка использования в БД, удаление только «наших» файлов.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    book: { findFirst: vi.fn() },
    collection: { findFirst: vi.fn() },
    celebrity: { findFirst: vi.fn() },
    tierList: { findFirst: vi.fn() },
    bookPlacement: { findFirst: vi.fn() },
    newsArticle: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    contentFlag: { findFirst: vi.fn() },
  },
  storage: { deleteFile: vi.fn() },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("./index.js", () => ({ storage: mocks.storage }));
// S3_* в тестовом env не заданы — мокаем config с продакшен-хостами
vi.mock("../../config/env.js", () => ({
  config: {
    NODE_ENV: "test",
    LOG_DIR: "/tmp/bookstrata-test-logs",
    S3_PUBLIC_HOST: "s3.twcstorage.ru",
    CDN_PUBLIC_HOST: "re406cj9uj.cdn.twcstorage.ru",
    S3_BUCKET: "bookstrata-bucket",
    UPLOADS_BASE_URL: "/uploads",
  },
}));

import {
  extractStorageKey,
  isUrlInUse,
  deleteIfOrphaned,
  deleteCoverIfChanged,
} from "./file-cleanup.js";

describe("extractStorageKey", () => {
  it("S3 URL с именем бакета → key", () => {
    expect(
      extractStorageKey("https://s3.twcstorage.ru/bookstrata-bucket/tiermaker-pro/book-covers/abc.webp"),
    ).toBe("tiermaker-pro/book-covers/abc.webp");
  });

  it("CDN URL → key без бакета", () => {
    expect(
      extractStorageKey("https://re406cj9uj.cdn.twcstorage.ru/tiermaker-pro/book-covers/abc.webp"),
    ).toBe("tiermaker-pro/book-covers/abc.webp");
  });

  it("локальный URL (/uploads/...) → как есть", () => {
    expect(extractStorageKey("/uploads/book-covers/abc.webp")).toBe(
      "/uploads/book-covers/abc.webp",
    );
  });

  it("внешние URL (amazon, litres) → null", () => {
    expect(extractStorageKey("https://m.media-amazon.com/images/I/51.jpg")).toBeNull();
    expect(extractStorageKey("https://cdn.litres.ru/pub/c/cover_415/58887294")).toBeNull();
  });

  it("пустые значения → null", () => {
    expect(extractStorageKey(null)).toBeNull();
    expect(extractStorageKey(undefined)).toBeNull();
    expect(extractStorageKey("")).toBeNull();
  });
});

describe("isUrlInUse", () => {
  beforeEach(() => vi.clearAllMocks());

  it("true, если книга ссылается на URL", async () => {
    mocks.prisma.book.findFirst.mockResolvedValue({ id: 1 });

    expect(await isUrlInUse("https://re406cj9uj.cdn.twcstorage.ru/x.webp")).toBe(true);
  });

  it("true, если коллекция ссылается через bookCovers", async () => {
    mocks.prisma.collection.findFirst.mockResolvedValue({ id: 2 });

    expect(await isUrlInUse("https://s3.twcstorage.ru/bucket/x.webp")).toBe(true);
  });

  it("false, если никто не ссылается", async () => {
    for (const model of Object.values(mocks.prisma)) {
      (model.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    }

    expect(await isUrlInUse("https://re406cj9uj.cdn.twcstorage.ru/x.webp")).toBe(false);
  });
});

describe("deleteIfOrphaned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("наш URL без ссылок в БД → файл удаляется", async () => {
    for (const model of Object.values(mocks.prisma)) {
      (model.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    }

    const deleted = await deleteIfOrphaned(
      "https://s3.twcstorage.ru/bookstrata-bucket/tiermaker-pro/book-covers/abc.webp",
    );

    expect(deleted).toBe(true);
    expect(mocks.storage.deleteFile).toHaveBeenCalledWith(
      "tiermaker-pro/book-covers/abc.webp",
    );
  });

  it("URL в использовании → файл НЕ удаляется", async () => {
    mocks.prisma.book.findFirst.mockResolvedValue({ id: 1 });

    const deleted = await deleteIfOrphaned(
      "https://s3.twcstorage.ru/bookstrata-bucket/tiermaker-pro/book-covers/abc.webp",
    );

    expect(deleted).toBe(false);
    expect(mocks.storage.deleteFile).not.toHaveBeenCalled();
  });

  it("внешний URL (не наш) → не трогаем", async () => {
    const deleted = await deleteIfOrphaned("https://cdn.litres.ru/pub/c/cover_415/1");

    expect(deleted).toBe(false);
    expect(mocks.storage.deleteFile).not.toHaveBeenCalled();
  });

  it("ошибка удаления не пробрасывается", async () => {
    for (const model of Object.values(mocks.prisma)) {
      (model.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    }
    mocks.storage.deleteFile.mockRejectedValue(new Error("s3 down"));

    await expect(
      deleteIfOrphaned("https://s3.twcstorage.ru/bookstrata-bucket/tiermaker-pro/book-covers/abc.webp"),
    ).resolves.toBe(false);
  });
});

describe("deleteCoverIfChanged", () => {
  beforeEach(() => vi.clearAllMocks());

  it("одинаковые URL → ничего не удаляется", async () => {
    const deleted = await deleteCoverIfChanged("/a.jpg", "/a.jpg");

    expect(deleted).toBeUndefined();
    expect(mocks.storage.deleteFile).not.toHaveBeenCalled();
  });

  it("URL изменился → вызывается deleteIfOrphaned со старым", async () => {
    for (const model of Object.values(mocks.prisma)) {
      (model.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    }

    await deleteCoverIfChanged(
      "https://s3.twcstorage.ru/bookstrata-bucket/tiermaker-pro/book-covers/old.webp",
      "https://s3.twcstorage.ru/bookstrata-bucket/tiermaker-pro/book-covers/new.webp",
    );

    expect(mocks.storage.deleteFile).toHaveBeenCalledWith(
      "tiermaker-pro/book-covers/old.webp",
    );
  });

  it("старая обложка пустая → ничего не удаляется", async () => {
    await deleteCoverIfChanged(null, "/new.jpg");

    expect(mocks.storage.deleteFile).not.toHaveBeenCalled();
  });
});