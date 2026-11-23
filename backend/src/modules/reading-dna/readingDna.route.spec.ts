import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { readingDnaRoutes } from "./readingDna.route.js";

const mocks = vi.hoisted(() => ({
  previewDna: vi.fn(),
  saveDna: vi.fn(),
  getTicket: vi.fn(),
  conductDuel: vi.fn(),
  findTwins: vi.fn(),
  getArchetypeCatalog: vi.fn(),
  getMyDna: vi.fn(),
  incrementShareCount: vi.fn(),
  getTicketDuels: vi.fn(),
  getArchetypeStats: vi.fn(),
}));

let mockCurrentUser: { userId: number } | null = null;

const celebrityMocks = vi.hoisted(() => ({
  getCelebritiesWithDna: vi.fn(),
  conductCelebrityDuel: vi.fn(),
}));

vi.mock("./readingDna.service.js", () => ({
  previewDna: mocks.previewDna,
  saveDna: mocks.saveDna,
  getTicket: mocks.getTicket,
  conductDuel: mocks.conductDuel,
  findTwins: mocks.findTwins,
  getArchetypeCatalog: mocks.getArchetypeCatalog,
  getMyDna: mocks.getMyDna,
  incrementShareCount: mocks.incrementShareCount,
  getTicketDuels: mocks.getTicketDuels,
  getArchetypeStats: mocks.getArchetypeStats,
}));

vi.mock("./celebrityDna.service.js", () => ({
  getCelebritiesWithDna: celebrityMocks.getCelebritiesWithDna,
  conductCelebrityDuel: celebrityMocks.conductCelebrityDuel,
}));

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn(async (request: any, reply: any) => {
    if (!mockCurrentUser) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    request.user = mockCurrentUser;
  }),
}));

describe("readingDna.route", () => {
  let app: FastifyInstance;

  const validPayload = {
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
    kryptoniteBook: { title: "Сумерки", author: "С. Майер" },
    likedGenres: ["Классика"],
    dislikedGenres: ["Детектив"],
    favoriteAuthors: ["Джойс"],
    theme: "dark",
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(readingDnaRoutes, { prefix: "/api/reading-dna" });
    await app.ready();
  });

  describe("POST /api/reading-dna/preview", () => {
    it("возвращает 200 и превью при валидных данных", async () => {
      mocks.previewDna.mockResolvedValue({
        archetype: "meaning-architect",
        archetypeName: "Архитектор смыслов",
        motto: "Книга — инструмент",
        axes: validPayload.axes,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/reading-dna/preview",
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.archetype).toBe("meaning-architect");
      expect(mocks.previewDna).toHaveBeenCalled();
    });

    it("возвращает 400 при невалидном body (например, 2 книги вместо 3)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reading-dna/preview",
        payload: {
          ...validPayload,
          favoriteBooks: [{ title: "Книга 1" }],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(mocks.previewDna).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/reading-dna/save", () => {
    it("возвращает 200 и сохраненный билет", async () => {
      mocks.saveDna.mockResolvedValue({
        id: 1,
        ticketNumber: "BS-7492-X",
        archetype: "meaning-architect",
        axes: validPayload.axes,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/reading-dna/save",
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.ticketNumber).toBe("BS-7492-X");
    });
  });

  describe("GET /api/reading-dna/ticket/:ticketNumber", () => {
    it("возвращает 200 для существующего билета", async () => {
      mocks.getTicket.mockResolvedValue({
        id: 1,
        ticketNumber: "BS-7492-X",
        archetype: "meaning-architect",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/ticket/BS-7492-X",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.ticketNumber).toBe("BS-7492-X");
    });

    it("возвращает 404 для несуществующего билета", async () => {
      mocks.getTicket.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/ticket/BS-UNKNOWN",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /api/reading-dna/duel", () => {
    it("возвращает 200 и результат расчета дуэли", async () => {
      mocks.conductDuel.mockResolvedValue({
        compatibility: 87,
        verdict: "Книжные единомышленники",
        targetTicketNumber: "BS-7492-X",
        breakdown: { axesSimilarity: 90 },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/reading-dna/duel",
        payload: {
          targetTicketNumber: "BS-7492-X",
          challengerName: "Оппонент",
          challengerDna: validPayload,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.compatibility).toBe(87);
    });
  });

  describe("GET /api/reading-dna/duels/:ticketNumber", () => {
    it("возвращает 200 и сводку дуэлей с лучшим совпадением и антагонистом", async () => {
      mocks.getTicketDuels.mockResolvedValue({
        totalDuels: 2,
        bestMatch: {
          id: 1,
          opponentName: "Маша",
          opponentTicketNumber: "BS-1111-A",
          opponentArchetypeName: "Искатель истин",
          compatibility: 92,
          verdict: "Литературные соулмейты",
          kryptoniteConflict: false,
          createdAt: "2026-11-21T10:00:00.000Z",
        },
        mainAntagonist: {
          id: 2,
          opponentName: "Игорь",
          opponentTicketNumber: "BS-2222-B",
          opponentArchetypeName: "Архивариус Бездны",
          compatibility: 24,
          verdict: "Полярные противоположности",
          kryptoniteConflict: true,
          createdAt: "2026-11-21T11:00:00.000Z",
        },
        recentDuels: [],
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/duels/BS-7492-X?limit=5",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.totalDuels).toBe(2);
      expect(json.data.bestMatch.opponentName).toBe("Маша");
      expect(json.data.mainAntagonist.opponentName).toBe("Игорь");
      expect(mocks.getTicketDuels).toHaveBeenCalledWith("BS-7492-X", 5);
    });

    it("возвращает 404, если билет не найден", async () => {
      mocks.getTicketDuels.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/duels/BS-MISSING",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /api/reading-dna/archetypes", () => {
    it("возвращает 200 и полный каталог из 16 читательских архетипов", async () => {
      const { ARCHETYPES } = await import("./archetypes.data.js");
      mocks.getArchetypeCatalog.mockReturnValue(ARCHETYPES);

      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/archetypes",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data).toBeDefined();
      expect(json.data.archetypes).toBeInstanceOf(Array);
      expect(json.data.archetypes.length).toBe(16);

      const first = json.data.archetypes[0];
      expect(first.id).toBeTruthy();
      expect(first.caste).toBeDefined();
      expect(first.caste.name).toBeTruthy();
      expect(first.names.dark).toBeTruthy();
      expect(first.names.craft).toBeTruthy();
      expect(first.rarity).toBeGreaterThanOrEqual(1);
      expect(first.number).toBe(1);
      expect(first.axisRanges.storyFocus).toBeDefined();
      expect(first.axisRanges.storyFocus.min).toBeLessThan(first.axisRanges.storyFocus.max);
    });
  });

  describe("GET /api/reading-dna/stats", () => {
    it("возвращает 200 и реальное распределение архетипов по базе", async () => {
      mocks.getArchetypeStats.mockResolvedValue({
        totalTickets: 250,
        distribution: {
          "meaning-architect": { count: 15, percent: 6 },
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/stats",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.totalTickets).toBe(250);
      expect(json.data.distribution["meaning-architect"]).toEqual({ count: 15, percent: 6 });
    });
  });

  describe("GET /api/reading-dna/celebrities & POST /duel/celebrity/:slug", () => {
    it("GET /celebrities возвращает список знаменитостей с вычисленным ДНК", async () => {
      celebrityMocks.getCelebritiesWithDna.mockResolvedValue([
        { id: 1, slug: "stephen-king", name: "Стивен Кинг", archetypeName: "Архивариус Бездны" },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/celebrities",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.celebrities).toHaveLength(1);
    });

    it("POST /duel/celebrity/:slug возвращает 400 без challengerTicketNumber и challengerDna", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reading-dna/duel/celebrity/stephen-king",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("POST /duel/celebrity/:slug возвращает 200 и результат дуэли со знаменитостью", async () => {
      celebrityMocks.conductCelebrityDuel.mockResolvedValue({
        compatibility: 82,
        verdict: "Книжные единомышленники",
        breakdown: { kryptoniteConflict: false },
        celebrity: { id: 1, slug: "stephen-king", name: "Стивен Кинг" },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/reading-dna/duel/celebrity/stephen-king",
        payload: { challengerTicketNumber: "BS-7492-X" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.compatibility).toBe(82);
      expect(celebrityMocks.conductCelebrityDuel).toHaveBeenCalledWith({
        slug: "stephen-king",
        challengerTicketNumber: "BS-7492-X",
        challengerDna: undefined,
      });
    });
  });

  describe("GET /api/reading-dna/me", () => {
    it("возвращает 401 без авторизации", async () => {
      mockCurrentUser = null;
      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/me",
      });
      expect(response.statusCode).toBe(401);
    });

    it("возвращает 200 и { dna: null }, если у авторизованного пользователя нет ДНК", async () => {
      mockCurrentUser = { userId: 42 };
      mocks.getMyDna.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/me",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.dna).toBeNull();
      expect(mocks.getMyDna).toHaveBeenCalledWith(42);
    });

    it("возвращает 200 и данные билета, если у пользователя есть ДНК", async () => {
      mockCurrentUser = { userId: 42 };
      const sampleTicket = {
        ticketNumber: "BS-7492-X",
        archetype: "meaning-architect",
        archetypeName: "Архитектор смыслов",
      };
      mocks.getMyDna.mockResolvedValue(sampleTicket);

      const response = await app.inject({
        method: "GET",
        url: "/api/reading-dna/me",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.dna).toEqual(sampleTicket);
      expect(mocks.getMyDna).toHaveBeenCalledWith(42);
    });
  });

  describe("POST /api/reading-dna/share", () => {
    it("возвращает 400 при отсутствии ticketNumber", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reading-dna/share",
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it("возвращает 404, если билет не найден", async () => {
      mocks.incrementShareCount.mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/reading-dna/share",
        payload: { ticketNumber: "BS-NONEXISTENT" },
      });

      expect(response.statusCode).toBe(404);
      expect(mocks.incrementShareCount).toHaveBeenCalledWith("BS-NONEXISTENT");
    });

    it("возвращает 200 и обновленный shareCount для существующего билета", async () => {
      mocks.incrementShareCount.mockResolvedValue(5);

      const response = await app.inject({
        method: "POST",
        url: "/api/reading-dna/share",
        payload: { ticketNumber: "BS-7492-X" },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.shareCount).toBe(5);
      expect(mocks.incrementShareCount).toHaveBeenCalledWith("BS-7492-X");
    });
  });
});
