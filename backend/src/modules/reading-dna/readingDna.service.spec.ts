import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    readingDna: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    readingDnaDuel: {
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

import { prisma } from "../../lib/prisma.js";
import {
  previewDna,
  saveDna,
  getTicket,
  conductDuel,
  findTwins,
  incrementShareCount,
} from "./readingDna.service.js";
import type { ReadingDnaInput } from "./readingDna.schema.js";

describe("readingDna.service", () => {
  const sampleInput: ReadingDnaInput = {
    axes: {
      storyFocus: 85,
      emotionalWeight: 80,
      pace: 70,
      darkness: 60,
      scope: 75,
      complexity: 90,
    },
    favoriteBooks: [
      { title: "Улисс", author: "Дж. Джойс", bookId: 101 },
      { title: "Игра в бисер", author: "Г. Гессе", bookId: 102 },
      { title: "Имя розы", author: "У. Эко" },
    ],
    kryptoniteBook: { title: "Сумерки", author: "С. Майер", bookId: 999 },
    likedGenres: ["Философия", "Классика"],
    dislikedGenres: ["Бульварный детектив"],
    favoriteAuthors: ["Джойс", "Гессе", "Эко"],
    customName: "Интеллектуал",
    theme: "dark",
    guestToken: "guest-token-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("previewDna", () => {
    it("генерирует превью билета без сохранения в базу данных", async () => {
      const preview = await previewDna(sampleInput);

      expect(preview.archetype).toBe("meaning-architect");
      expect(preview.archetypeName).toBe("Архитектор смыслов");
      expect(preview.motto).toContain("препарирования");
      expect(preview.axes.complexity).toBe(90);
      expect(prisma.readingDna.create).not.toHaveBeenCalled();
    });
  });

  describe("saveDna", () => {
    it("сохраняет профиль в БД и генерирует уникальный номер билета BS-XXXX-X", async () => {
      const mockCreatedRecord = {
        id: 1,
        userId: 42,
        guestToken: null,
        ticketNumber: "BS-7492-A",
        customName: "Интеллектуал",
        archetype: "meaning-architect",
        archetypeName: "Архитектор смыслов",
        archetypeDesc: "Интеллектуальная проза...",
        motto: "Книга — инструмент...",
        storyFocus: 85,
        emotionalWeight: 80,
        pace: 70,
        darkness: 60,
        scope: 75,
        complexity: 90,
        favoriteBooks: sampleInput.favoriteBooks,
        kryptoniteBook: sampleInput.kryptoniteBook,
        favoriteBookIds: [101, 102],
        kryptoniteBookId: 999,
        likedGenres: ["Философия", "Классика"],
        dislikedGenres: ["Бульварный детектив"],
        favoriteAuthors: ["Джойс", "Гессе", "Эко"],
        theme: "dark",
        shareUrl: "https://bookstrata.ru/reading-dna?ticket=BS-7492-A",
        shortCode: "7492A",
        qrCodeUrl: null,
        ticketImageUrl: null,
        isPublic: true,
        viewsCount: 0,
        shareCount: 0,
        duelsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.readingDna.findUnique as any).mockResolvedValue(null);
      (prisma.readingDna.upsert as any).mockResolvedValue(mockCreatedRecord);

      const saved = await saveDna(sampleInput, 42);

      expect(prisma.readingDna.upsert).toHaveBeenCalled();
      expect(saved.ticketNumber).toBe("BS-7492-A");
      expect(saved.archetype).toBe("meaning-architect");
      expect(saved.axes.storyFocus).toBe(85);
    });
  });

  describe("getTicket", () => {
    it("находит билет по ticketNumber и инкрементирует просмотры", async () => {
      const mockRecord = {
        id: 1,
        userId: null,
        guestToken: "guest-token-123",
        ticketNumber: "BS-7492-A",
        customName: "Аноним",
        archetype: "meaning-architect",
        archetypeName: "Архитектор смыслов",
        archetypeDesc: "Описание",
        motto: "Манифест",
        storyFocus: 85,
        emotionalWeight: 80,
        pace: 70,
        darkness: 60,
        scope: 75,
        complexity: 90,
        favoriteBooks: sampleInput.favoriteBooks,
        kryptoniteBook: sampleInput.kryptoniteBook,
        favoriteBookIds: [101, 102],
        kryptoniteBookId: 999,
        likedGenres: ["Классика"],
        dislikedGenres: [],
        favoriteAuthors: [],
        theme: "dark",
        shareUrl: "https://bookstrata.ru/reading-dna?ticket=BS-7492-A",
        shortCode: "7492A",
        qrCodeUrl: null,
        ticketImageUrl: null,
        isPublic: true,
        viewsCount: 5,
        shareCount: 1,
        duelsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.readingDna.findFirst as any).mockResolvedValue(mockRecord);
      (prisma.readingDna.findUnique as any).mockResolvedValue(mockRecord);
      (prisma.readingDna.update as any).mockResolvedValue({
        ...mockRecord,
        viewsCount: 6,
      });

      const ticket = await getTicket("BS-7492-A");

      expect(ticket).not.toBeNull();
      expect(ticket?.ticketNumber).toBe("BS-7492-A");
      expect(prisma.readingDna.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { viewsCount: { increment: 1 } },
      });
    });

    it("возвращает null, если билет не найден", async () => {
      (prisma.readingDna.findUnique as any).mockResolvedValue(null);
      (prisma.readingDna.findFirst as any).mockResolvedValue(null);

      const ticket = await getTicket("BS-UNKNOWN");
      expect(ticket).toBeNull();
    });
  });

  describe("conductDuel", () => {
    it("рассчитывает результат дуэли и сохраняет запись в БД", async () => {
      const mockTarget = {
        id: 1,
        ticketNumber: "BS-7492-A",
        storyFocus: 85,
        emotionalWeight: 80,
        pace: 70,
        darkness: 60,
        scope: 75,
        complexity: 90,
        favoriteBooks: sampleInput.favoriteBooks,
        kryptoniteBook: sampleInput.kryptoniteBook,
        likedGenres: sampleInput.likedGenres,
        dislikedGenres: sampleInput.dislikedGenres,
        favoriteAuthors: sampleInput.favoriteAuthors,
        theme: "dark",
      };

      (prisma.readingDna.findUnique as any).mockResolvedValue(mockTarget);
      (prisma.readingDnaDuel.create as any).mockResolvedValue({ id: 10 });
      (prisma.readingDna.update as any).mockResolvedValue({});

      const duelResult = await conductDuel({
        targetTicketNumber: "BS-7492-A",
        challengerName: "Читатель2",
        challengerDna: sampleInput,
      });

      expect(duelResult.compatibility).toBeGreaterThanOrEqual(95);
      expect(prisma.readingDnaDuel.create).toHaveBeenCalled();
      expect(prisma.readingDna.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { duelsCount: { increment: 1 } },
      });
    });
  });

  describe("findTwins (nearest-neighbour)", () => {
    const mockCurrentTicket = {
      id: 10,
      ticketNumber: "BS-1000-A",
      archetype: "dark-archivist",
      archetypeName: "Хранитель запретных фолиантов",
      archetypeDesc: "Описание",
      motto: "Цитата",
      storyFocus: 60,
      emotionalWeight: 80,
      pace: 40,
      darkness: 90,
      scope: 50,
      complexity: 70,
      favoriteBooks: [{ title: "Книга 1" }, { title: "Книга 2" }, { title: "Книга 3" }],
      kryptoniteBook: null,
      likedGenres: ["Классика"],
      dislikedGenres: ["Детектив"],
      favoriteAuthors: ["Автор 1"],
      theme: "dark",
      isPublic: true,
      shareUrl: null,
      shortCode: null,
      qrCodeUrl: null,
      ticketImageUrl: null,
      viewsCount: 0,
      shareCount: 0,
      duelsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("запрашивает кандидатов с фильтром по окну осей ±30, isPublic: true и id != current.id", async () => {
      (prisma.readingDna.findUnique as any).mockResolvedValue(mockCurrentTicket);
      (prisma.readingDna.findMany as any).mockResolvedValue([]);

      await findTwins("BS-1000-A", 5);

      expect(prisma.readingDna.findMany).toHaveBeenCalledWith({
        where: {
          isPublic: true,
          id: { not: 10 },
          storyFocus: { gte: 30, lte: 90 },
          emotionalWeight: { gte: 50, lte: 100 },
          pace: { gte: 10, lte: 70 },
          darkness: { gte: 60, lte: 100 },
          scope: { gte: 20, lte: 80 },
          complexity: { gte: 40, lte: 100 },
        },
        take: expect.any(Number),
      });
    });

    it("сортирует результат по убыванию similarity и ограничивает limit записями", async () => {
      (prisma.readingDna.findUnique as any).mockResolvedValue(mockCurrentTicket);

      // 3 кандидата с разной степенью сходства
      const candidateFar = {
        ...mockCurrentTicket,
        id: 11,
        ticketNumber: "BS-1111-B",
        storyFocus: 35,
        emotionalWeight: 55,
        pace: 65,
        darkness: 65,
        scope: 25,
        complexity: 45,
      };

      const candidateClose = {
        ...mockCurrentTicket,
        id: 12,
        ticketNumber: "BS-2222-C",
        storyFocus: 62,
        emotionalWeight: 82,
        pace: 42,
        darkness: 88,
        scope: 52,
        complexity: 72,
      };

      const candidateTwin = {
        ...mockCurrentTicket,
        id: 13,
        ticketNumber: "BS-3333-D",
        // идентичные оси и вкусы
      };

      (prisma.readingDna.findMany as any).mockResolvedValue([
        candidateFar,
        candidateTwin,
        candidateClose,
      ]);

      const twins = await findTwins("BS-1000-A", 2);

      expect(twins.length).toBe(2);
      expect(twins[0]?.id).toBe(13); // candidateTwin
      expect(twins[1]?.id).toBe(12); // candidateClose
      expect(twins[0]?.similarity).toBeGreaterThanOrEqual(twins[1]?.similarity ?? 0);
    });

    it("возвращает пустой массив, если текущий билет не найден", async () => {
      (prisma.readingDna.findUnique as any).mockResolvedValue(null);

      const twins = await findTwins("BS-UNKNOWN", 5);
      expect(twins).toEqual([]);
      expect(prisma.readingDna.findMany).not.toHaveBeenCalled();
    });
  });

  describe("incrementShareCount", () => {
    it("инкрементирует shareCount и возвращает новое значение", async () => {
      (prisma.readingDna.findFirst as any).mockResolvedValue({ id: 10, ticketNumber: "BS-1000-A" });
      (prisma.readingDna.update as any).mockResolvedValue({ shareCount: 4 });

      const count = await incrementShareCount("BS-1000-A");

      expect(prisma.readingDna.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ ticketNumber: "BS-1000-A" }, { shortCode: "BS-1000-A" }] },
      });
      expect(prisma.readingDna.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { shareCount: { increment: 1 } },
        select: { shareCount: true },
      });
      expect(count).toBe(4);
    });

    it("возвращает null, если билет не найден", async () => {
      (prisma.readingDna.findFirst as any).mockResolvedValue(null);

      const count = await incrementShareCount("BS-NONEXISTENT");

      expect(count).toBeNull();
      expect(prisma.readingDna.update).not.toHaveBeenCalled();
    });
  });
});
