import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";

const ogMocks = vi.hoisted(() => ({
  findReadingDnaForOg: vi.fn(),
  buildReadingDnaOgFallbackHtml: vi.fn(),
}));

vi.mock("./readingDnaOg.service.js", () => ({
  findReadingDnaForOg: ogMocks.findReadingDnaForOg,
  buildReadingDnaOgFallbackHtml: ogMocks.buildReadingDnaOgFallbackHtml,
}));

import { readingDnaRedirectRoutes } from "./readingDnaRedirect.route.js";

describe("readingDnaRedirect.route", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
    await app.register(readingDnaRedirectRoutes);
    await app.ready();
  });

  it("возвращает 200 и HTML с кэшем для прямого запроса /reading-dna", async () => {
    ogMocks.buildReadingDnaOgFallbackHtml.mockReturnValue("<!DOCTYPE html><html><head><title>DNA</title></head></html>");

    const res = await app.inject({
      method: "GET",
      url: "/reading-dna",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
    expect(ogMocks.findReadingDnaForOg).not.toHaveBeenCalled();
    expect(ogMocks.buildReadingDnaOgFallbackHtml).toHaveBeenCalledWith({
      ticket: null,
      mode: "ticket",
      queryParamValue: undefined,
    });
  });

  it("ищет билет и формирует OG-теги при ?ticket=BS-7492-X", async () => {
    const mockTicket = {
      ticketNumber: "BS-7492-X",
      customName: "Фёдор",
      archetypeName: "Архитектор смыслов",
      motto: "Строить мосты",
      storyFocus: 85,
      emotionalWeight: 80,
      pace: 70,
      darkness: 60,
      scope: 75,
      complexity: 90,
      updatedAt: new Date(),
    };
    ogMocks.findReadingDnaForOg.mockResolvedValue(mockTicket);
    ogMocks.buildReadingDnaOgFallbackHtml.mockReturnValue("<!DOCTYPE html><html><head><title>Фёдор</title></head></html>");

    const res = await app.inject({
      method: "GET",
      url: "/reading-dna?ticket=BS-7492-X",
    });

    expect(res.statusCode).toBe(200);
    expect(ogMocks.findReadingDnaForOg).toHaveBeenCalledWith("BS-7492-X");
    expect(ogMocks.buildReadingDnaOgFallbackHtml).toHaveBeenCalledWith({
      ticket: mockTicket,
      mode: "ticket",
      queryParamValue: "BS-7492-X",
    });
  });

  it("переключает режим на 'challenge' при наличии ?challenge= или ?duel=", async () => {
    ogMocks.findReadingDnaForOg.mockResolvedValue(null);
    ogMocks.buildReadingDnaOgFallbackHtml.mockReturnValue("<!DOCTYPE html><html><head><title>Вызов</title></head></html>");

    const res = await app.inject({
      method: "GET",
      url: "/reading-dna?challenge=BS-1111-A",
    });

    expect(res.statusCode).toBe(200);
    expect(ogMocks.findReadingDnaForOg).toHaveBeenCalledWith("BS-1111-A");
    expect(ogMocks.buildReadingDnaOgFallbackHtml).toHaveBeenCalledWith({
      ticket: null,
      mode: "challenge",
      queryParamValue: "BS-1111-A",
    });
  });

  it("поддерживает QR-маршрут /reading-dna/duel?ticket=BS-7492-X в режиме challenge", async () => {
    ogMocks.findReadingDnaForOg.mockResolvedValue(null);
    ogMocks.buildReadingDnaOgFallbackHtml.mockReturnValue("<!DOCTYPE html><html><head><title>Дуэль</title></head></html>");

    const res = await app.inject({
      method: "GET",
      url: "/reading-dna/duel?ticket=BS-7492-X",
    });

    expect(res.statusCode).toBe(200);
    expect(ogMocks.findReadingDnaForOg).toHaveBeenCalledWith("BS-7492-X");
    expect(ogMocks.buildReadingDnaOgFallbackHtml).toHaveBeenCalledWith({
      ticket: null,
      mode: "challenge",
      queryParamValue: "BS-7492-X",
    });
  });

  it("поддерживает ?compare=A&with=B в режиме challenge", async () => {
    ogMocks.findReadingDnaForOg.mockResolvedValue(null);
    ogMocks.buildReadingDnaOgFallbackHtml.mockReturnValue("<!DOCTYPE html><html><head><title>Сравнение</title></head></html>");

    const res = await app.inject({
      method: "GET",
      url: "/reading-dna?compare=BS-1111-A&with=BS-2222-B",
    });

    expect(res.statusCode).toBe(200);
    expect(ogMocks.findReadingDnaForOg).toHaveBeenCalledWith("BS-2222-B");
    expect(ogMocks.buildReadingDnaOgFallbackHtml).toHaveBeenCalledWith({
      ticket: null,
      mode: "challenge",
      queryParamValue: "BS-2222-B",
    });
  });
});
