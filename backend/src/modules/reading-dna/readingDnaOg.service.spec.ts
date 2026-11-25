import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    readingDna: {
      findFirst: vi.fn(),
    },
  },
  config: {
    CLIENT_URL: "https://bookstrata.ru",
  },
  getSpaIndexHtml: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("../../config/env.js", () => ({ config: mocks.config }));
vi.mock("../tier-lists/tierListRedirect.service.js", () => ({
  getSpaIndexHtml: mocks.getSpaIndexHtml,
}));

import {
  findReadingDnaForOg,
  buildReadingDnaOgFallbackHtml,
  type ReadingDnaOgMeta,
} from "./readingDnaOg.service.js";

describe("readingDnaOg.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findReadingDnaForOg", () => {
    it("отклоняет небезопасный код билета и возвращает null без обращения к БД", async () => {
      const result = await findReadingDnaForOg("<script>alert(1)</script>");
      expect(result).toBeNull();
      expect(mocks.prisma.readingDna.findFirst).not.toHaveBeenCalled();
    });

    it("ищет билет по ticketNumber или shortCode", async () => {
      const mockTicket = {
        ticketNumber: "BS-7492-X",
        customName: "Анна",
        archetypeName: "Архивариус Бездны",
        motto: "Искать истину во тьме",
        storyFocus: 90,
        emotionalWeight: 80,
        pace: 50,
        darkness: 95,
        scope: 70,
        complexity: 85,
        updatedAt: new Date("2026-11-20T10:00:00Z"),
      };
      mocks.prisma.readingDna.findFirst.mockResolvedValue(mockTicket);

      const result = await findReadingDnaForOg("BS-7492-X");
      expect(result).toEqual(mockTicket);
      expect(mocks.prisma.readingDna.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { ticketNumber: "BS-7492-X" },
            { shortCode: "BS-7492-X" },
          ],
        },
        select: expect.any(Object),
      });
    });
  });

  describe("buildReadingDnaOgFallbackHtml", () => {
    it("генерирует HTML со стандартными тегами, если билет не передан", () => {
      mocks.getSpaIndexHtml.mockReturnValue(null);

      const html = buildReadingDnaOgFallbackHtml({
        ticket: null,
        mode: "ticket",
      });

      expect(html).toContain("<title>Книжный ДНК: узнай свой читательский архетип | BookStrata</title>");
      expect(html).toContain('property="og:image" content="https://bookstrata.ru/og-reading-dna.webp"');
      expect(html).toContain('name="robots" content="noindex, follow"');
    });

    it("генерирует персонализированные OG-теги для билета с кастомным именем", () => {
      mocks.getSpaIndexHtml.mockReturnValue(null);
      const ticket: ReadingDnaOgMeta = {
        ticketNumber: "BS-1111-A",
        customName: "Алексей",
        archetypeName: "Искатель истин",
        motto: "Книги открывают миры",
        storyFocus: 80,
        emotionalWeight: 75,
        pace: 60,
        darkness: 40,
        scope: 70,
        complexity: 85,
        updatedAt: new Date("2026-11-21T12:00:00Z"),
      };

      const html = buildReadingDnaOgFallbackHtml({
        ticket,
        mode: "ticket",
      });

      expect(html).toContain("<title>Книжный паспорт: Искатель истин (BS-1111-A) | BookStrata</title>");
      expect(html).toContain("Читательский билет BS-1111-A (Алексей)");
      expect(html).toContain("https://bookstrata.ru/api/reading-dna/og/BS-1111-A.png?mode=ticket");
    });

    it("генерирует заголовок вызова на книжную дуэль при mode='challenge'", () => {
      mocks.getSpaIndexHtml.mockReturnValue(null);
      const ticket: ReadingDnaOgMeta = {
        ticketNumber: "BS-2222-B",
        customName: null,
        archetypeName: "Созидатель миров",
        motto: null,
        storyFocus: 95,
        emotionalWeight: 60,
        pace: 70,
        darkness: 50,
        scope: 90,
        complexity: 75,
        updatedAt: new Date("2026-11-22T12:00:00Z"),
      };

      const html = buildReadingDnaOgFallbackHtml({
        ticket,
        mode: "challenge",
      });

      expect(html).toContain("<title>Вызов на книжную дуэль · Архетип: Созидатель миров | BookStrata</title>");
      expect(html).toContain("https://bookstrata.ru/api/reading-dna/og/BS-2222-B.png?mode=challenge");
    });
  });
});
