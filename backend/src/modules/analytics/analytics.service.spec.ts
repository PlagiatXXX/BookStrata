import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем конфиг до импорта сервиса (EXCLUDED_USERNAMES читается на загрузке модуля)
vi.mock("../../config/env.js", () => ({
  config: {
    ANALYTICS_EXCLUDE_USERNAMES: "",
  },
}));

import { createAnalyticsService } from "./analytics.service.js";
import type { PrismaClient } from "@prisma/client";

describe("Analytics trackEvent: лимиты и защита от мусора", () => {
  let prismaMock: { analyticsEvent: { create: ReturnType<typeof vi.fn> } };
  let service: ReturnType<typeof createAnalyticsService>;

  beforeEach(() => {
    prismaMock = {
      analyticsEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    service = createAnalyticsService(prismaMock as unknown as PrismaClient);
  });

  it("принимает легитимное событие", async () => {
    await service.trackEvent({ event: "page_view", url: "/books/dune" });
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalled();
  });

  it("принимает динамическое событие data-analytics (точки, id)", async () => {
    await service.trackEvent({ event: "cta.landing.try_template_12" });
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalled();
  });

  it("ОТБРАСЫВАЕТ событие не по формату (пробелы, HTML, unicode)", async () => {
    await service.trackEvent({ event: "<img src=x onerror=alert(1)>" });
    await service.trackEvent({ event: "мусорное событие" });
    await service.trackEvent({ event: "a".repeat(200) });
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("обрезает url до 512 символов", async () => {
    await service.trackEvent({ event: "page_view", url: "h" + "x".repeat(1000) });
    const saved = prismaMock.analyticsEvent.create.mock.calls[0][0].data;
    expect(saved.url.length).toBeLessThanOrEqual(512);
  });

  it("обрезает meta больше 2KB при сериализации", async () => {
    await service.trackEvent({ event: "book_search", meta: { query: "y".repeat(5000) } });
    const saved = prismaMock.analyticsEvent.create.mock.calls[0][0].data;
    expect(JSON.stringify(saved.meta).length).toBeLessThanOrEqual(2048);
  });

  it("обрезает userAgent до 256 символов", async () => {
    await service.trackEvent({ event: "page_view", userAgent: "UA/" + "u".repeat(1000) });
    const saved = prismaMock.analyticsEvent.create.mock.calls[0][0].data;
    expect(saved.userAgent.length).toBeLessThanOrEqual(256);
  });

  it("ОТБРАСЫВАЕТ события от ботов по userAgent (meta-externalagent)", async () => {
    await service.trackEvent({
      event: "page_view",
      url: "/auth",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (compatible; meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler))",
    });
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("ОТБРАСЫВАЕТ события от ботов (bot/crawl/spider/slurp/headless, без учёта регистра)", async () => {
    const botUAs = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
      "Twitterbot/1.0",
      "Some Crawler Spider v1",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/131.0.0.0 Safari/537.36",
      "curl/8.5.0",
    ];
    for (const userAgent of botUAs) {
      await service.trackEvent({ event: "page_view", url: "/auth", userAgent });
    }
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("ПРОПУСКАЕТ события реальных пользователей (не ботов)", async () => {
    await service.trackEvent({
      event: "page_view",
      url: "/books/dune",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    });
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalled();
  });

  it("ПРОПУСКАЕТ событие без userAgent (тесты, серверные вызовы)", async () => {
    await service.trackEvent({ event: "page_view", url: "/books/dune" });
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalled();
  });

  it("игнорирует meta с прототипными ключами (prototype pollution)", async () => {
    await service.trackEvent({
      event: "page_view",
      meta: { __proto__: 1, constructor: 2 } as unknown as Record<string, unknown>,
    });
    // Не упало и не записало прототипные ключи
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalled();
    const saved = prismaMock.analyticsEvent.create.mock.calls[0][0].data;
    expect(JSON.stringify(saved.meta)).not.toContain("constructor");
  });
});
