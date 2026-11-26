import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем конфиг до импорта сервиса (EXCLUDED_USERNAMES читается на загрузке модуля)
vi.mock("../../config/env.js", () => ({
  config: {
    ANALYTICS_EXCLUDE_USERNAMES: "",
  },
}));

import { createAnalyticsService, getMoscowDayStart, parseMoscowDateBound } from "./analytics.service.js";
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

describe("Analytics: cleanupOldEvents, Metrics, Funnel, Retention", () => {
  it("cleanupOldEvents сначала запускает роллап, а затем удаляет события старше 90 дней", async () => {
    const prismaMock = {
      analyticsEvent: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    const service = createAnalyticsService(prismaMock as any);
    const count = await service.cleanupOldEvents();
    expect(count).toBe(5);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(4); // 4 метрики роллапа
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

  it("getMetrics корректно считает DAU/MAU/Stickiness/Churn и дельты из SQL", async () => {
    const prismaMock = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([
          {
            dau: 12n,
            dau_yesterday: 10n,
            wau: 30n,
            mau: 80n,
            prev_mau: 50n,
            retained_from_prev_mau: 35n,
            visitors_today: 40n,
            visitors_yesterday: 32n,
          },
        ])
        .mockResolvedValueOnce([{ new_today: 4n, new_yesterday: 2n }]),
    };
    const service = createAnalyticsService(prismaMock as any);
    const metrics = await service.getMetrics();
    expect(metrics).toEqual({
      dau: 12,
      wau: 30,
      mau: 80,
      stickiness: 15,
      churn: 15,
      churnRate: 30,
      uniqueVisitorsToday: 40,
      deltas: {
        dauYesterday: 10,
        visitorsYesterday: 32,
        newUsersToday: 4,
        newUsersYesterday: 2,
        dauPctChange: 20,
        visitorsPctChange: 25,
      },
    });
  });

  it("getRetention возвращает null если когорты пусты и считает матрицу недель", async () => {
    const prismaMock = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([
          {
            d1_eligible: 0n,
            d1_retained: 0n,
            d7_eligible: 0n,
            d7_retained: 0n,
            d30_eligible: 0n,
            d30_retained: 0n,
          },
        ])
        .mockResolvedValueOnce([]),
    };
    const service = createAnalyticsService(prismaMock as any);
    const retention = await service.getRetention();
    expect(retention.d1).toBeNull();
    expect(retention.d7).toBeNull();
    expect(retention.d30).toBeNull();
    expect(retention.weeklyMatrix).toEqual([]);
  });

  it("getRetention считает проценты D1/D7/D30 и когорты", async () => {
    const prismaMock = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([
          {
            d1_eligible: 20n,
            d1_retained: 5n,
            d7_eligible: 10n,
            d7_retained: 2n,
            d30_eligible: 0n,
            d30_retained: 0n,
          },
        ])
        .mockResolvedValueOnce([
          {
            week_start: new Date("2026-11-23T00:00:00.000Z"),
            cohort_size: 10n,
            w0: 10n,
            w1: 4n,
            w2: 0n,
            w3: 0n,
            w4: 0n,
          },
        ]),
    };
    const service = createAnalyticsService(prismaMock as any);
    const retention = await service.getRetention();
    expect(retention.d1).toBe(25);
    expect(retention.d7).toBe(20);
    expect(retention.d30).toBeNull();
    expect(retention.cohorts.d1).toEqual({ eligible: 20, retained: 5, rate: 25 });
    expect(retention.weeklyMatrix[0]!.cohortSize).toBe(10);
  });

  it("getFunnel возвращает последовательные activation и acquisition воронки", async () => {
    const prismaMock = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{ step1: 100n, step2: 60n, step3: 30n, step4: 15n }])
        .mockResolvedValueOnce([{ step1: 500n, step2: 200n, step3: 80n, step4: 40n }]),
    };
    const service = createAnalyticsService(prismaMock as any);
    const funnel = await service.getFunnel(30);
    expect(funnel.stages.map((s) => s.name)).toEqual([
      "Регистрация",
      "Создание тир-листа",
      "Наполнение / сохранение",
      "Публикация / PNG / Шейр",
    ]);
    expect(funnel.activation.stages[1]!.conversionFromPrev).toBe(60);
    expect(funnel.acquisition.stages[0]!.count).toBe(500);
    expect(funnel.acquisition.stages[3]!.conversionFromStart).toBe(8);
  });

  it("getTimeseries маппит временной ряд и числа", async () => {
    const prismaMock = {
      $queryRaw: vi.fn().mockResolvedValueOnce([
        {
          day: new Date("2026-11-26T00:00:00.000Z"),
          visitors: 33n,
          dau: 11n,
          registrations: 2n,
          tierlists: 5n,
          searches: 14n,
          ai_requests: 3n,
        },
      ]),
    };
    const service = createAnalyticsService(prismaMock as any);
    const ts = await service.getTimeseries(7);
    expect(ts.days).toBe(7);
    expect(ts.points).toEqual([
      {
        date: "2026-11-26",
        visitors: 33,
        dau: 11,
        registrations: 2,
        tierlists: 5,
        searches: 14,
        aiRequests: 3,
      },
    ]);
  });

  it("getInsights собирает страницы, пустые поиски, устройства и фичи", async () => {
    const prismaMock = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{ url: "/books/dune", views: 50n, unique_visitors: 30n }])
        .mockResolvedValueOnce([{ query: "дюна", count: 12n, avg_results: 4.5 }])
        .mockResolvedValueOnce([{ query: "редкая книга", count: 3n }])
        .mockResolvedValueOnce([{ device_type: "mobile", count: 25n }])
        .mockResolvedValueOnce([{ browser: "Chrome", count: 20n }])
        .mockResolvedValueOnce([{ source: "telegram", visits: 15n, unique_visitors: 10n }])
        .mockResolvedValueOnce([
          {
            ai_librarian_messages: 7n,
            ai_avatars: 2n,
            dna_started: 9n,
            dna_sealed: 5n,
            dna_duels: 3n,
            dna_shared: 1n,
            exports_png: 4n,
            shares: 6n,
            donate_opens: 2n,
            donate_copies: 1n,
          },
        ]),
    };
    const service = createAnalyticsService(prismaMock as any);
    const insights = await service.getInsights(30);
    expect(insights.topPages[0]).toEqual({ url: "/books/dune", views: 50, uniqueVisitors: 30 });
    expect(insights.zeroResultSearches[0]).toEqual({ query: "редкая книга", count: 3 });
    expect(insights.features.dnaSealed).toBe(5);
    expect(insights.features.exportsPng).toBe(4);
  });

  it("getUserJourney склеивает профиль пользователя, его anonymousId и историю событий", async () => {
    const prismaMock = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 42,
          username: "anna",
          avatarUrl: null,
          isPro: true,
          createdAt: new Date("2026-11-01T10:00:00.000Z"),
          lastActivityAt: new Date("2026-11-27T10:00:00.000Z"),
          totalActiveMinutes: 120,
          role: { name: "user" },
          _count: { tierLists: 3, bookComments: 4, tierListLikes: 8 },
        }),
      },
      analyticsEvent: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ anonymousId: "anon-42" }])
          .mockResolvedValueOnce([
            {
              id: 1n,
              userId: null,
              anonymousId: "anon-42",
              sessionId: "s1",
              event: "session_start",
              meta: {},
              url: "/",
              ip: null,
              userAgent: null,
              deviceType: "mobile",
              browser: "Safari",
              os: "iOS",
              referrer: "https://t.me/test",
              utmSource: "telegram",
              utmMedium: null,
              utmCampaign: null,
              createdAt: new Date("2026-11-01T09:55:00.000Z"),
              user: null,
            },
          ]),
        findFirst: vi.fn().mockResolvedValue({
          referrer: "https://t.me/test",
          utmSource: "telegram",
          utmMedium: null,
          utmCampaign: null,
        }),
      },
    };
    const service = createAnalyticsService(prismaMock as any);
    const journey = await service.getUserJourney({ userId: 42 });

    expect(journey.user?.username).toBe("anna");
    expect(journey.user?.tierListsCount).toBe(3);
    expect(journey.anonymousId).toBe("anon-42");
    expect(journey.firstSource?.utmSource).toBe("telegram");
    expect(journey.devices).toEqual(["mobile (Safari)"]);
    expect(journey.events).toHaveLength(1);
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

describe("Analytics: новые поля контекста, batch и фильтр дат МСК", () => {
  it("игнорирует session_heartbeat при записи", async () => {
    const prismaMock = {
      analyticsEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const service = createAnalyticsService(prismaMock as unknown as PrismaClient);
    await service.trackEvent({ event: "session_heartbeat", userId: 10 });
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("сохраняет deviceType/browser/os, anonymousId, sessionId и UTM-метки", async () => {
    const prismaMock = {
      analyticsEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const service = createAnalyticsService(prismaMock as unknown as PrismaClient);
    await service.trackEvent({
      event: "session_start",
      anonymousId: "anon-uuid",
      sessionId: "sess-uuid",
      utmSource: "telegram",
      utmMedium: "social",
      utmCampaign: "spring",
      referrer: "https://t.me/channel",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1",
    });

    const saved = prismaMock.analyticsEvent.create.mock.calls[0]![0].data;
    expect(saved).toMatchObject({
      event: "session_start",
      anonymousId: "anon-uuid",
      sessionId: "sess-uuid",
      utmSource: "telegram",
      utmMedium: "social",
      utmCampaign: "spring",
      referrer: "https://t.me/channel",
      deviceType: "mobile",
      browser: "Safari",
      os: "iOS",
    });
  });

  it("при ошибке FK (P2003) повторяет запись с userId: null", async () => {
    const fkError = Object.assign(new Error("FK violation"), { code: "P2003" });
    const prismaMock = {
      analyticsEvent: {
        create: vi.fn().mockRejectedValueOnce(fkError).mockResolvedValueOnce({}),
      },
    };
    const service = createAnalyticsService(prismaMock as unknown as PrismaClient);
    await service.trackEvent({ event: "page_view", userId: 99999 });

    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.analyticsEvent.create.mock.calls[1]![0].data.userId).toBeNull();
  });

  it("trackBatch вставляет только валидные события пачкой через createMany", async () => {
    const prismaMock = {
      analyticsEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const service = createAnalyticsService(prismaMock as unknown as PrismaClient);
    await service.trackBatch([
      { event: "session_heartbeat" },
      { event: "page_view", url: "/books/dune" },
      { event: "export_png", userAgent: "Googlebot/2.1" },
    ]);

    expect(prismaMock.analyticsEvent.createMany).toHaveBeenCalledTimes(1);
    const rows = prismaMock.analyticsEvent.createMany.mock.calls[0]![0].data;
    expect(rows).toHaveLength(1);
    expect(rows[0].event).toBe("page_view");
  });

  it("parseMoscowDateBound строит границы дня YYYY-MM-DD в UTC+3", () => {
    const start = parseMoscowDateBound("2026-11-26", "start");
    const end = parseMoscowDateBound("2026-11-26", "end");
    expect(start?.toISOString()).toBe("2026-11-25T21:00:00.000Z");
    expect(end?.toISOString()).toBe("2026-11-26T20:59:59.999Z");
  });

  it("getEvents применяет excludeEvents и границы дат МСК", async () => {
    const prismaMock = {
      analyticsEvent: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    const service = createAnalyticsService(prismaMock as unknown as PrismaClient);
    await service.getEvents({
      excludeEvents: ["page_view"],
      from: "2026-11-26",
      to: "2026-11-26",
      limit: 50,
    });

    const whereArg = prismaMock.analyticsEvent.findMany.mock.calls[0]![0].where;
    expect(whereArg.AND).toEqual(
      expect.arrayContaining([
        { event: { notIn: ["page_view"] } },
        { createdAt: { gte: new Date("2026-11-25T21:00:00.000Z") } },
        { createdAt: { lte: new Date("2026-11-26T20:59:59.999Z") } },
      ]),
    );
  });
});


