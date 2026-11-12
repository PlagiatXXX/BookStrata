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
});
