import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем конфиг до импорта сервиса (EXCLUDED_USERNAMES читается на загрузке модуля)
vi.mock("../../config/env.js", () => ({
  config: {
    ANALYTICS_EXCLUDE_USERNAMES: "",
  },
}));

import { createAnalyticsService, getMoscowDayStart } from "./analytics.service.js";
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

describe("Analytics: cleanupOldEvents и Churn", () => {
  it("cleanupOldEvents по умолчанию удаляет события старше 90 дней", async () => {
    const prismaMock = {
      analyticsEvent: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
    };
    const service = createAnalyticsService(prismaMock as any);
    const count = await service.cleanupOldEvents();
    expect(count).toBe(5);
    expect(prismaMock.analyticsEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: expect.any(Date),
        },
      },
    });
    const cutoffArg = (prismaMock.analyticsEvent.deleteMany as any).mock.calls[0][0].where.createdAt.lt;
    const diffDays = Math.round((Date.now() - cutoffArg.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });

  it("getMetrics корректно считает Churn, когда в предыдущие 30-60 дней были активные пользователи", async () => {
    const prismaMock = {
      analyticsEvent: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ userId: 1 }]) // DAU: user 1
          .mockResolvedValueOnce([{ userId: 1 }, { userId: 2 }]) // MAU: users 1, 2
          .mockResolvedValueOnce([{ userId: 2 }, { userId: 3 }]) // Prev 30-60d: users 2, 3
          .mockResolvedValueOnce([]), // unique visitors
      },
    };
    const service = createAnalyticsService(prismaMock as any);
    const metrics = await service.getMetrics();
    // Из prev (2, 3) в current MAU (1, 2) остался только 2, оттек 3 (1 из 2 = 50%)
    expect(metrics.churn).toBe(1);
    expect(metrics.churnRate).toBe(50);
  });
});

describe("Analytics: getMetrics uniqueVisitorsToday", () => {
  it("возвращает количество уникальных IP за сегодня", async () => {
    const prismaMock = {
      analyticsEvent: {
        findMany: vi.fn()
          .mockResolvedValueOnce([]) // dau
          .mockResolvedValueOnce([]) // mau
          .mockResolvedValueOnce([]) // prevActiveUsers
          .mockResolvedValueOnce([{ ip: '1.2.3.4' }, { ip: '5.6.7.8' }]), // unique visitors by IP
      },
    };
    const service = createAnalyticsService(prismaMock as any);
    const metrics = await service.getMetrics();
    expect(metrics.uniqueVisitorsToday).toBe(2);
  });
});

describe("Analytics: getRetention", () => {
  it("возвращает null для периодов, где не было регистраций", async () => {
    const prismaMock = {
      analyticsEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const service = createAnalyticsService(prismaMock as any);
    const retention = await service.getRetention();
    expect(retention).toEqual({ d1: null, d7: null, d30: null });
  });

  it("считает когортный retention среди пользователей, зарегистрированных в окне", async () => {
    const regDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000); // 4 дня назад (окно d1 завершилось)
    const prismaMock = {
      analyticsEvent: {
        findMany: vi.fn()
          // Вызовы для d1:
          .mockResolvedValueOnce([{ userId: 10, createdAt: regDate }]) // registrations
          .mockResolvedValueOnce([{ userId: 10, createdAt: new Date(regDate.getTime() + 25 * 3600 * 1000) }]) // activities
          // Вызовы для d7:
          .mockResolvedValueOnce([]) // нет регистраций старше 7 дней
          // Вызовы для d30:
          .mockResolvedValueOnce([]), // нет регистраций старше 30 дней
      },
    };
    const service = createAnalyticsService(prismaMock as any);
    const retention = await service.getRetention();
    expect(retention.d1).toBe(100);
    expect(retention.d7).toBeNull();
    expect(retention.d30).toBeNull();
  });

  it("возвращает 0%, если пользователь зарегистрирован в окне, но не имеет активности в целевой день (или активность вне окна)", async () => {
    const regDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const prismaMock = {
      analyticsEvent: {
        findMany: vi.fn()
          // Вызовы для d1:
          .mockResolvedValueOnce([
            { userId: 10, createdAt: regDate },
            { userId: 11, createdAt: regDate },
          ]) // 2 пользователя в когорте
          .mockResolvedValueOnce([
            // Активности пользователя 10: до окна D1 (12ч) и после окна D1 (60ч)
            { userId: 10, createdAt: new Date(regDate.getTime() + 12 * 3600 * 1000) },
            { userId: 10, createdAt: new Date(regDate.getTime() + 60 * 3600 * 1000) },
            // У пользователя 11 активностей нет
          ])
          // Вызовы для d7:
          .mockResolvedValueOnce([])
          // Вызовы для d30:
          .mockResolvedValueOnce([]),
      },
    };
    const service = createAnalyticsService(prismaMock as any);
    const retention = await service.getRetention();
    expect(retention.d1).toBe(0);
    expect(retention.d7).toBeNull();
    expect(retention.d30).toBeNull();
  });
});

describe("Analytics: getFunnel", () => {
  it("содержит этап 'Наполнение тир-листа' и исключает фиктивную публикацию", async () => {
    const prismaMock = {
      analyticsEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const service = createAnalyticsService(prismaMock as any);
    const funnel = await service.getFunnel(30);
    const stageNames = funnel.stages.map((s) => s.name);
    expect(stageNames).toEqual([
      'Регистрация',
      'Создание тир-листа',
      'Наполнение тир-листа',
      'Поделились',
    ]);
    expect(prismaMock.analyticsEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: { in: ['book_placed', 'tierlist_save'] },
        }),
      })
    );
  });
});

describe("Analytics: getMoscowDayStart", () => {
  it("возвращает полночь по Москве (UTC+3) независимо от локальной зоны", () => {
    // 00:30 МСК 9 ноября = 21:30 UTC 8 ноября
    const earlyMorning = new Date("2026-11-08T21:30:00.000Z");
    const start1 = getMoscowDayStart(earlyMorning);
    expect(start1.toISOString()).toBe("2026-11-08T21:00:00.000Z");

    // 23:59 МСК 9 ноября = 20:59 UTC 9 ноября
    const lateNight = new Date("2026-11-09T20:59:00.000Z");
    const start2 = getMoscowDayStart(lateNight);
    expect(start2.toISOString()).toBe("2026-11-08T21:00:00.000Z");

    // 00:05 МСК 10 ноября = 21:05 UTC 9 ноября
    const nextDay = new Date("2026-11-09T21:05:00.000Z");
    const start3 = getMoscowDayStart(nextDay);
    expect(start3.toISOString()).toBe("2026-11-09T21:00:00.000Z");
  });
});


