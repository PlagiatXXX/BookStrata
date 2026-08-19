import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma.js";
import { normalizeTitle, matchBook, type BookCandidate } from "./bookMatching.service.js";

function candidate(partial: Partial<BookCandidate> = {}): BookCandidate {
  return {
    id: 1,
    title: "Война и мир",
    author: "Лев Толстой",
    authorId: 10,
    coverImageUrl: "/cover.jpg",
    slug: "voyna-i-mir",
    status: "published",
    source: null,
    externalId: null,
    publishedYear: 1869,
    rating: 8.5,
    ...partial,
  };
}

/**
 * Полный SQL-текст из вызова мокнутого $queryRaw: [strings, ...values].
 * Рекурсивно разворачивает Prisma.raw-фрагменты ({ strings, values }),
 * которые в таг-вызове уходят в values объектами.
 */
function sqlText(call: unknown[] | undefined): string {
  if (!call) return "";
  const parts: string[] = [];
  const visit = (v: unknown) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      v.forEach(visit);
    } else if (
      typeof v === "object" &&
      Array.isArray((v as { strings?: unknown }).strings)
    ) {
      const sql = v as { strings: unknown[]; values?: unknown[] };
      sql.strings.forEach(visit);
      (sql.values ?? []).forEach(visit);
    } else {
      parts.push(String(v));
    }
  };
  call.forEach(visit);
  return parts.join(" ");
}

describe("normalizeTitle", () => {
  it("lower + trim + ё→е + схлопывание пробелов", () => {
    expect(normalizeTitle("  Война и мир  ")).toBe("война и мир");
    expect(normalizeTitle("Ёлка   и    Пень")).toBe("елка и пень");
  });

  it("снимает кавычки, скобки и тире", () => {
    expect(normalizeTitle("«Война и мир»")).toBe("война и мир");
    expect(normalizeTitle("1984 — роман")).toBe("1984 роман");
    expect(normalizeTitle("Дюна (книга 1)")).toBe("дюна книга 1");
  });
});

describe("matchBook: externalId (ступень 1)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("externalId+source → HIGH, без дальнейших запросов", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(candidate({ source: "google_books", externalId: "vol-1" }));

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      externalId: "vol-1",
      source: "google_books",
    });

    expect(result.confidence).toBe("HIGH");
    expect(result.book?.id).toBe(1);
    expect(prisma.book.findMany).not.toHaveBeenCalled();
  });

  it("externalId без source → НЕ срабатывает (идём по каскаду)", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      externalId: "vol-1",
    });

    expect(result.book).toBeNull();
    // каскад пошёл дальше: 3b — точное по строке автора (raw), автор не резолвнут
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });
});

describe("matchBook: точное совпадение (ступень 2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("3a: ровно один кандидат по (normTitle, authorId) → HIGH", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([candidate({ title: "Война и мир" })]);

    const result = await matchBook(prisma as any, {
      title: "  «война и мир»  ",
      author: "Лев Толстой",
      authorId: 10,
    });

    expect(result.confidence).toBe("HIGH");
    expect(result.book?.id).toBe(1);
    // findMany искал именно по authorId
    expect((prisma.book.findMany as any).mock.calls[0]?.[0]).toMatchObject({ where: { authorId: 10 } });
  });

  it("3a: несколько кандидатов с одинаковым названием → MEDIUM (неоднозначность → draft)", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([
      candidate({ id: 1, title: "Война и мир", authorId: 10 }),
      candidate({ id: 2, title: "Война и мир", authorId: 10 }),
    ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      authorId: 10,
    });

    expect(result.book).toBeNull();
    expect(result.confidence).toBe("MEDIUM");
  });

  it("3b: нерезолвнутый автор — точное (normTitle, normAuthor-строка) → HIGH", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce([
        // 3b: кандидат с точно таким же автором
        { ...candidate({ id: 5, title: "Война и мир", author: "Лев Толстой" }), score: 1 },
      ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: " Лев толстой ",
    });

    expect(result.confidence).toBe("HIGH");
    expect(result.book?.id).toBe(5);
  });

  it("3b: автор с «ё» при резолвнутом authorId (книга backfill без authorId) → HIGH по строке", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]); // 3a по authorId пусто
    (prisma.$queryRaw as any).mockResolvedValueOnce([
      { ...candidate({ id: 5, title: "Война и мир", author: "Фёдор Достоевский", authorId: null }), score: 1 },
    ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Фёдор Достоевский",
      authorId: 10,
    });

    expect(result.confidence).toBe("HIGH");
    expect(result.book?.id).toBe(5);
    // запрос снимает «ё→е» на стороне SQL (translate)
    const sql = sqlText((prisma.$queryRaw as any).mock.calls[0]);
    expect(sql).toContain("translate(author");
  });

  it("3c: безавторная — ровно один кандидат по normTitle → HIGH", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.$queryRaw as any).mockResolvedValueOnce([
      { ...candidate({ id: 7, title: "Аноним", author: null, authorId: null }), score: 1 },
    ]);

    const result = await matchBook(prisma as any, {
      title: " аноним ",
    });

    expect(result.confidence).toBe("HIGH");
    expect(result.book?.id).toBe(7);
  });

  it("3c: два безавторных кандидата → MEDIUM", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.$queryRaw as any).mockResolvedValueOnce([
      { ...candidate({ id: 7, title: "Аноним", author: null, authorId: null }), score: 1 },
      { ...candidate({ id: 8, title: " аноним ", author: null, authorId: null }), score: 1 },
    ]);

    const result = await matchBook(prisma as any, { title: "Аноним" });

    expect(result.book).toBeNull();
    expect(result.confidence).toBe("MEDIUM");
  });
});

describe("matchBook: fuzzy (ступень 3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fuzzy: кандидат с authorId=null, но совпавшей строкой автора → HIGH (книги backfill)", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]); // точных по authorId нет
    (prisma.$queryRaw as any).mockResolvedValue([
      { ...candidate({ id: 9, title: "Война и миръ", authorId: null, author: "Лев Толстой" }), score: 0.95 },
    ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      authorId: 10,
    });

    expect(result.confidence).toBe("HIGH");
    expect(result.book?.id).toBe(9);
  });

  it("score ≥ 0.9 и автор совпал по authorId → HIGH", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]); // точных нет
    (prisma.$queryRaw as any).mockResolvedValue([
      { ...candidate({ id: 9, title: "Война и миръ", authorId: 10 }), score: 0.93 },
      { ...candidate({ id: 3, title: "Война миров", authorId: 10 }), score: 0.72 },
    ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      authorId: 10,
    });

    expect(result.confidence).toBe("HIGH");
    expect(result.book?.id).toBe(9);
  });

  it("score 0.7–0.9 → MEDIUM: draft + кандидаты на склейку", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([
      { ...candidate({ id: 9, title: "Война и миров", authorId: 10 }), score: 0.75 },
    ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      authorId: 10,
    });

    expect(result.book).toBeNull();
    expect(result.confidence).toBe("MEDIUM");
    expect(result.candidates.map((c) => c.id)).toEqual([9]);
  });

  it("score < 0.7 → LOW: draft без кандидатов", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([
      { ...candidate({ id: 9, title: "Война", authorId: 10 }), score: 0.55 },
    ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      authorId: 10,
    });

    expect(result.book).toBeNull();
    expect(result.confidence).toBe("LOW");
    expect(result.candidates).toEqual([]);
  });

  it("автор НЕ совпал → кандидат отбрасывается (null, без confidence)", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([
      { ...candidate({ id: 9, title: "Война и миръ", authorId: 99 }), score: 0.95 },
    ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      authorId: 10,
    });

    expect(result.book).toBeNull();
    expect(result.confidence).toBeNull();
  });

  it("равные score у top-2 → неоднозначность: draft, MEDIUM", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([
      { ...candidate({ id: 9, title: "Война и мир 1", authorId: 10 }), score: 0.8 },
      { ...candidate({ id: 11, title: "Война и мир 2", authorId: 10 }), score: 0.8 },
    ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      authorId: 10,
    });

    expect(result.book).toBeNull();
    expect(result.confidence).toBe("MEDIUM");
  });
});

describe("matchBook: statusFilter (каталог не видит draft)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("externalId: с statusFilter запрос фильтрует по статусу", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);

    await matchBook(prisma as any, {
      title: "Война и мир",
      externalId: "vol-1",
      source: "google_books",
    }, { statusFilter: "published" });

    expect((prisma.book.findFirst as any).mock.calls[0]?.[0].where).toMatchObject({
      externalId: "vol-1",
      status: "published",
    });
  });

  it("externalId: без statusFilter статус не добавляется", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);

    await matchBook(prisma as any, {
      title: "Война и мир",
      externalId: "vol-1",
      source: "google_books",
    });

    expect((prisma.book.findFirst as any).mock.calls[0]?.[0].where.status).toBeUndefined();
  });

  it("3a: точное по (normTitle, authorId) — фильтр по статусу в where", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);

    await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      authorId: 10,
    }, { statusFilter: "published" });

    expect((prisma.book.findMany as any).mock.calls[0]?.[0].where).toMatchObject({
      authorId: 10,
      status: "published",
    });
  });

  it("3b: raw-запрос по строке автора содержит статусный фильтр", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.$queryRaw as any).mockResolvedValue([
      { ...candidate({ id: 5, title: "Война и мир", author: "Лев Толстой" }), score: 1 },
    ]);

    const result = await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
    }, { statusFilter: "published" });

    expect(result.book?.id).toBe(5);
    const sql = sqlText((prisma.$queryRaw as any).mock.calls[0]);
    expect(sql).toContain("status::text = 'published'");
  });

  it("3b: без statusFilter raw-запрос не фильтрует по статусу", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.$queryRaw as any).mockResolvedValue([]);

    await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
    });

    const sql = sqlText((prisma.$queryRaw as any).mock.calls[0]);
    expect(sql).not.toContain("status::text");
  });

  it("fuzzy: raw-запрос содержит статусный фильтр", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);

    await matchBook(prisma as any, {
      title: "Война и мир",
      author: "Лев Толстой",
      authorId: 10,
    }, { statusFilter: "published" });

    const sql = sqlText((prisma.$queryRaw as any).mock.calls[0]);
    expect(sql).toContain("status::text = 'published'");
  });

  it("3c: безавторная ветка — raw-запрос фильтрует по статусу", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.$queryRaw as any).mockResolvedValue([
      { ...candidate({ id: 7, title: "Аноним", author: null, authorId: null }), score: 1 },
    ]);

    const result = await matchBook(prisma as any, {
      title: "Аноним",
    }, { statusFilter: "published" });

    expect(result.book?.id).toBe(7);
    const sql = sqlText((prisma.$queryRaw as any).mock.calls[0]);
    expect(sql).toContain("status::text = 'published'");
  });
});

describe("matchBook: опция fuzzy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fuzzy: false → точное совпадение по (title, authorId) работает", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([
      { id: 1, title: "Война и мир", author: "Лев Толстой", authorId: 10,
        coverImageUrl: "/c.jpg", slug: "v", status: "published",
        source: null, externalId: null, publishedYear: null, rating: null },
    ]);
    (prisma.$queryRaw as any).mockResolvedValue([]);

    const res = await matchBook(prisma as any, { title: "Война и мир", author: "Лев Толстой", authorId: 10 }, { fuzzy: false });
    expect(res.book?.id).toBe(1);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("fuzzy: false → без точного совпадения возвращает null, fuzzy-этап пропущен", async () => {
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    // 3b (точный по строке автора) → пусто; fuzzy-этап вернул бы HIGH-кандидата,
    // но при fuzzy: false он не вызывается
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 2, title: "Война и миръ", author: "Лев Толстой", authorId: 10,
          coverImageUrl: "/c.jpg", slug: "v2", status: "published",
          source: null, externalId: null, publishedYear: null, rating: null, score: 0.99 },
      ]);

    const res = await matchBook(prisma as any, { title: "Война и мир", author: "Лев Толстой", authorId: 10 }, { fuzzy: false });

    expect(res.book).toBeNull();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1); // только 3b; fuzzy не вызван
  });
});