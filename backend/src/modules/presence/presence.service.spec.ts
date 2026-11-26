import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("../../config/env.js", () => ({
  config: {
    ANALYTICS_EXCLUDE_USERNAMES: "fedor",
  },
}));

import { createPresenceService, type PresenceRedisClient } from "./presence.service.js";

function createInMemoryRedis(): PresenceRedisClient {
  const strings = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();

  const getZset = (key: string) => {
    let map = zsets.get(key);
    if (!map) {
      map = new Map();
      zsets.set(key, map);
    }
    return map;
  };

  return {
    get: vi.fn(async (key: string) => strings.get(key) ?? null),
    mget: vi.fn(async (...keys: string[]) => keys.map((k) => strings.get(k) ?? null)),
    set: vi.fn(async (key: string, value: string, ...args: (string | number)[]) => {
      const isNx = args.includes("NX");
      if (isNx && strings.has(key)) return null;
      strings.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      for (const k of keys) {
        if (strings.delete(k)) count++;
      }
      return count;
    }),
    zadd: vi.fn(async (key: string, score: number, member: string) => {
      getZset(key).set(member, score);
      return 1;
    }),
    zrem: vi.fn(async (key: string, member: string) => {
      return getZset(key).delete(member) ? 1 : 0;
    }),
    zrange: vi.fn(async (key: string) => {
      return [...getZset(key).entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([member]) => member);
    }),
    zremrangebyscore: vi.fn(async (key: string, _min: string | number, max: string | number) => {
      const z = getZset(key);
      const maxNum = Number(max);
      let removed = 0;
      for (const [member, score] of z.entries()) {
        if (score <= maxNum) {
          z.delete(member);
          removed++;
        }
      }
      return removed;
    }),
  };
}

describe("PresenceService", () => {
  let redisMock: PresenceRedisClient;
  let prismaMock: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let service: ReturnType<typeof createPresenceService>;

  beforeEach(() => {
    redisMock = createInMemoryRedis();
    prismaMock = {
      user: {
        findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: number } }) => {
          if (where.id === 1) {
            return { id: 1, username: "fedor", avatarUrl: null, role: { name: "admin" } };
          }
          return { id: where.id, username: `reader_${where.id}`, avatarUrl: "/ava.png", role: { name: "user" } };
        }),
      },
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    service = createPresenceService(prismaMock as unknown as PrismaClient, redisMock);
  });

  it("фиксирует активного пользователя, удаляет гостевую запись с тем же anonId и начисляет 1 минуту с throttle", async () => {
    await service.ping({
      anonId: "anon-1",
      page: "/books/dune",
      status: "active",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0",
    });

    let snapshot = await service.getOnlineSnapshot();
    expect(snapshot.guestCount).toBe(1);
    expect(snapshot.authCount).toBe(0);

    // Тот же браузер залогинился как user 42
    await service.ping({
      userId: 42,
      anonId: "anon-1",
      page: "/tier-lists/new",
      status: "active",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0",
    });

    // Повторный пинг в течение 55с не должен второй раз инкрементировать минуты
    await service.ping({
      userId: 42,
      anonId: "anon-1",
      page: "/tier-lists/new",
      status: "active",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0",
    });

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);

    snapshot = await service.getOnlineSnapshot();
    expect(snapshot.guestCount).toBe(0);
    expect(snapshot.authCount).toBe(1);
    expect(snapshot.totalOnline).toBe(1);
    expect(snapshot.users[0]).toMatchObject({
      userId: 42,
      username: "reader_42",
      page: "/tier-lists/new",
      status: "active",
      deviceType: "desktop",
      isExcluded: false,
    });
  });

  it("при status=idle помечает пользователя как отошедшего и НЕ начисляет активные минуты", async () => {
    await service.ping({
      userId: 7,
      anonId: "anon-7",
      page: "/dashboard",
      status: "idle",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148",
    });

    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();

    const snapshot = await service.getOnlineSnapshot();
    expect(snapshot.idleCount).toBe(1);
    expect(snapshot.activeCount).toBe(0);
    expect(snapshot.users[0].status).toBe("idle");
    expect(snapshot.users[0].deviceType).toBe("mobile");
  });

  it("игнорирует ботов", async () => {
    await service.ping({
      anonId: "bot-1",
      page: "/books/dune",
      status: "active",
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)",
    });

    const snapshot = await service.getOnlineSnapshot();
    expect(snapshot.totalOnline).toBe(0);
  });

  it("leave немедленно удаляет пользователя и гостя из онлайна", async () => {
    await service.ping({
      userId: 10,
      anonId: "anon-10",
      page: "/",
      status: "active",
    });
    expect((await service.getOnlineSnapshot()).totalOnline).toBe(1);

    await service.leave({ userId: 10, anonId: "anon-10" });
    expect((await service.getOnlineSnapshot()).totalOnline).toBe(0);
  });

  it("показывает исключённого админа в списке с isExcluded=true, но не учитывает в authCount/totalOnline", async () => {
    await service.ping({
      userId: 1,
      anonId: "anon-admin",
      page: "/admin/analytics",
      status: "active",
    });
    await service.ping({
      userId: 2,
      anonId: "anon-user",
      page: "/books/1984",
      status: "active",
    });

    const snapshot = await service.getOnlineSnapshot();
    expect(snapshot.authCount).toBe(1);
    expect(snapshot.totalOnline).toBe(1);
    expect(snapshot.users).toHaveLength(2);
    expect(snapshot.users.find((u) => u.userId === 1)?.isExcluded).toBe(true);
    expect(snapshot.users.find((u) => u.userId === 2)?.isExcluded).toBe(false);
  });

  it("recordActiveMinuteWithThrottle ограничивает +1 минуту в Redis и корректно работает", async () => {
    const first = await service.recordActiveMinuteWithThrottle(55);
    const second = await service.recordActiveMinuteWithThrottle(55);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
