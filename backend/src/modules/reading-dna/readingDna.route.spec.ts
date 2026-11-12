import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { readingDnaRoutes } from "./readingDna.route.js";

const mocks = vi.hoisted(() => ({
  previewDna: vi.fn(),
  saveDna: vi.fn(),
  getTicket: vi.fn(),
  conductDuel: vi.fn(),
  findTwins: vi.fn(),
}));

vi.mock("./readingDna.service.js", () => ({
  previewDna: mocks.previewDna,
  saveDna: mocks.saveDna,
  getTicket: mocks.getTicket,
  conductDuel: mocks.conductDuel,
  findTwins: mocks.findTwins,
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
});
