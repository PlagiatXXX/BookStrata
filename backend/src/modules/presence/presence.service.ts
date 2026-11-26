import type { PrismaClient } from "@prisma/client";
import { config } from "../../config/env.js";
import { isBotUserAgent, parseUserAgent, type DeviceType } from "../../lib/user-agent.js";

export const PRESENCE_TTL_SEC = 90;
export const PRESENCE_TTL_MS = PRESENCE_TTL_SEC * 1000;
export const HEARTBEAT_MINUTE_TTL_SEC = 55;

const KEY_USERS_ZSET = "presence:users";
const KEY_GUESTS_ZSET = "presence:guests";
const userKey = (userId: number) => `presence:user:${userId}`;
const guestKey = (anonId: string) => `presence:guest:${anonId}`;
const minuteLockKey = (userId: number) => `heartbeat:minute:${userId}`;

export interface PresenceRedisClient {
  status?: string;
  get(key: string): Promise<string | null>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  zremrangebyscore(key: string, min: string | number, max: string | number): Promise<number>;
}

function isRedisAvailable(client: PresenceRedisClient): boolean {
  // В unit-тестах мок не задаёт status; у реального ioredis status === "ready" после старта сервера
  return !client.status || client.status === "ready" || client.status === "connect";
}

export interface PingPayload {
  userId?: number | null;
  anonId: string;
  page: string;
  status: "active" | "idle";
  userAgent?: string | null;
}

export interface LeavePayload {
  userId?: number | null;
  anonId?: string | null;
}

export interface OnlineUserDto {
  userId: number;
  username: string;
  avatarUrl: string | null;
  role: string;
  page: string;
  deviceType: DeviceType;
  status: "active" | "idle";
  startedAt: string;
  lastPingAt: string;
  sessionMinutes: number;
  isExcluded: boolean;
}

export interface OnlinePresenceSnapshot {
  totalOnline: number;
  authCount: number;
  guestCount: number;
  activeCount: number;
  idleCount: number;
  users: OnlineUserDto[];
  guestsByPage: Array<{ page: string; count: number }>;
  guestsByDevice: Array<{ deviceType: DeviceType; count: number }>;
  updatedAt: string;
}

export interface UserPresenceBrief {
  status: "active" | "idle";
  page: string;
}

interface StoredUserPresence {
  userId: number;
  username: string;
  avatarUrl: string | null;
  role: string;
  page: string;
  deviceType: DeviceType;
  status: "active" | "idle";
  startedAt: string;
  lastPingAt: string;
  isExcluded: boolean;
}

interface StoredGuestPresence {
  anonId: string;
  page: string;
  deviceType: DeviceType;
  status: "active" | "idle";
  startedAt: string;
  lastPingAt: string;
}

function getExcludedUsernames(): Set<string> {
  return new Set(
    config.ANALYTICS_EXCLUDE_USERNAMES.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function normalizePage(page: string): string {
  const trimmed = page.trim();
  if (!trimmed) return "/";
  return trimmed.slice(0, 512);
}

function safeParseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function createPresenceService(prisma: PrismaClient, redisClient: PresenceRedisClient) {
  const excludedUsernames = getExcludedUsernames();

  /**
   * Начисляет +1 активную минуту пользователю не чаще одного раза в 55 секунд.
   * Возвращает true, если минута засчитана.
   */
  const recordActiveMinuteWithThrottle = async (userId: number): Promise<boolean> => {
    let acquired = false;
    if (!isRedisAvailable(redisClient)) {
      acquired = true;
    } else {
      try {
        const reply = await redisClient.set(
          minuteLockKey(userId),
          "1",
          "EX",
          HEARTBEAT_MINUTE_TTL_SEC,
          "NX",
        );
        acquired = reply === "OK";
      } catch {
        // Если Redis временно недоступен, не ломаем запрос и обновляем только при fallback
        acquired = true;
      }
    }

    if (!acquired) return false;

    await prisma.$executeRaw`
      UPDATE "User"
      SET "total_active_minutes" = "total_active_minutes" + 1,
          "last_activity_at" = NOW()
      WHERE "id" = ${userId}
    `;
    return true;
  };

  const ping = async (payload: PingPayload): Promise<{ ok: true }> => {
    if (isBotUserAgent(payload.userAgent)) {
      return { ok: true };
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const page = normalizePage(payload.page);
    const { deviceType } = parseUserAgent(payload.userAgent);

    if (payload.userId) {
      // Если браузер до этого был гостем — убираем гостевую запись
      try {
        await Promise.all([
          redisClient.del(guestKey(payload.anonId)),
          redisClient.zrem(KEY_GUESTS_ZSET, payload.anonId),
        ]);
      } catch {
        // Игнорируем сбои Redis
      }

      let existing: StoredUserPresence | null = null;
      try {
        existing = safeParseJson<StoredUserPresence>(
          await redisClient.get(userKey(payload.userId)),
        );
      } catch {
        existing = null;
      }

      let username = existing?.username;
      let avatarUrl = existing?.avatarUrl ?? null;
      let role = existing?.role ?? "user";
      let isExcluded = existing?.isExcluded ?? false;

      if (!username) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            username: true,
            avatarUrl: true,
            role: { select: { name: true } },
          },
        });
        if (!user) {
          return { ok: true };
        }
        username = user.username;
        avatarUrl = user.avatarUrl ?? null;
        role = user.role?.name ?? "user";
        isExcluded = excludedUsernames.has(username);
      }

      const record: StoredUserPresence = {
        userId: payload.userId,
        username,
        avatarUrl,
        role,
        page,
        deviceType,
        status: payload.status,
        startedAt: existing?.startedAt ?? nowIso,
        lastPingAt: nowIso,
        isExcluded,
      };

      try {
        await Promise.all([
          redisClient.set(userKey(payload.userId), JSON.stringify(record), "EX", PRESENCE_TTL_SEC),
          redisClient.zadd(KEY_USERS_ZSET, now, String(payload.userId)),
        ]);
      } catch {
        // Redis недоступен — не блокируем работу приложения
      }

      if (payload.status === "active") {
        await recordActiveMinuteWithThrottle(payload.userId).catch(() => {});
      }

      return { ok: true };
    }

    // Гостевой визит
    let existingGuest: StoredGuestPresence | null = null;
    try {
      existingGuest = safeParseJson<StoredGuestPresence>(
        await redisClient.get(guestKey(payload.anonId)),
      );
    } catch {
      existingGuest = null;
    }

    const guestRecord: StoredGuestPresence = {
      anonId: payload.anonId,
      page,
      deviceType,
      status: payload.status,
      startedAt: existingGuest?.startedAt ?? nowIso,
      lastPingAt: nowIso,
    };

    try {
      await Promise.all([
        redisClient.set(guestKey(payload.anonId), JSON.stringify(guestRecord), "EX", PRESENCE_TTL_SEC),
        redisClient.zadd(KEY_GUESTS_ZSET, now, payload.anonId),
      ]);
    } catch {
      // ignore
    }

    return { ok: true };
  };

  const leave = async (payload: LeavePayload): Promise<{ ok: true }> => {
    if (!isRedisAvailable(redisClient)) return { ok: true };
    try {
      const ops: Promise<unknown>[] = [];
      if (payload.userId) {
        ops.push(redisClient.del(userKey(payload.userId)));
        ops.push(redisClient.zrem(KEY_USERS_ZSET, String(payload.userId)));
      }
      if (payload.anonId) {
        ops.push(redisClient.del(guestKey(payload.anonId)));
        ops.push(redisClient.zrem(KEY_GUESTS_ZSET, payload.anonId));
      }
      await Promise.all(ops);
    } catch {
      // ignore
    }
    return { ok: true };
  };

  const readActiveRecords = async (): Promise<{
    users: StoredUserPresence[];
    guests: StoredGuestPresence[];
  }> => {
    if (!isRedisAvailable(redisClient)) {
      return { users: [], guests: [] };
    }
    const cutoff = Date.now() - PRESENCE_TTL_MS;
    try {
      await Promise.all([
        redisClient.zremrangebyscore(KEY_USERS_ZSET, "-inf", cutoff),
        redisClient.zremrangebyscore(KEY_GUESTS_ZSET, "-inf", cutoff),
      ]);

      const [userIds, guestIds] = await Promise.all([
        redisClient.zrange(KEY_USERS_ZSET, 0, -1),
        redisClient.zrange(KEY_GUESTS_ZSET, 0, -1),
      ]);

      const [rawUsers, rawGuests] = await Promise.all([
        userIds.length > 0 ? redisClient.mget(...userIds.map((id) => userKey(Number(id)))) : Promise.resolve([]),
        guestIds.length > 0 ? redisClient.mget(...guestIds.map((id) => guestKey(id))) : Promise.resolve([]),
      ]);

      const users: StoredUserPresence[] = [];
      const staleUserIds: string[] = [];
      userIds.forEach((id, idx) => {
        const parsed = safeParseJson<StoredUserPresence>(rawUsers[idx]);
        if (parsed) {
          users.push(parsed);
        } else {
          staleUserIds.push(id);
        }
      });

      const guests: StoredGuestPresence[] = [];
      const staleGuestIds: string[] = [];
      guestIds.forEach((id, idx) => {
        const parsed = safeParseJson<StoredGuestPresence>(rawGuests[idx]);
        if (parsed) {
          guests.push(parsed);
        } else {
          staleGuestIds.push(id);
        }
      });

      // Подчищаем ключи, которые успели истечь по TTL между zrange и mget
      if (staleUserIds.length > 0 || staleGuestIds.length > 0) {
        await Promise.all([
          ...staleUserIds.map((id) => redisClient.zrem(KEY_USERS_ZSET, id)),
          ...staleGuestIds.map((id) => redisClient.zrem(KEY_GUESTS_ZSET, id)),
        ]).catch(() => {});
      }

      return { users, guests };
    } catch {
      return { users: [], guests: [] };
    }
  };

  const getOnlineSnapshot = async (): Promise<OnlinePresenceSnapshot> => {
    const now = Date.now();
    const { users, guests } = await readActiveRecords();

    const visibleUsers = users.filter((u) => !u.isExcluded);
    const activeCount =
      visibleUsers.filter((u) => u.status === "active").length +
      guests.filter((g) => g.status === "active").length;
    const idleCount =
      visibleUsers.filter((u) => u.status === "idle").length +
      guests.filter((g) => g.status === "idle").length;

    const guestPageCounts = new Map<string, number>();
    const guestDeviceCounts = new Map<DeviceType, number>();
    for (const g of guests) {
      guestPageCounts.set(g.page, (guestPageCounts.get(g.page) ?? 0) + 1);
      guestDeviceCounts.set(g.deviceType, (guestDeviceCounts.get(g.deviceType) ?? 0) + 1);
    }

    const formattedUsers: OnlineUserDto[] = users
      .map((u) => {
        const startedMs = new Date(u.startedAt).getTime();
        const sessionMinutes = Number.isNaN(startedMs)
          ? 0
          : Math.max(0, Math.round((now - startedMs) / 60_000));
        return {
          ...u,
          sessionMinutes,
        };
      })
      .sort((a, b) => {
        // Сначала реальные пользователи, затем исключённые; внутри — сначала active, потом новейший пинг
        if (a.isExcluded !== b.isExcluded) return a.isExcluded ? 1 : -1;
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        return new Date(b.lastPingAt).getTime() - new Date(a.lastPingAt).getTime();
      });

    const guestsByPage = [...guestPageCounts.entries()]
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const guestsByDevice = [...guestDeviceCounts.entries()]
      .map(([deviceType, count]) => ({ deviceType, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalOnline: visibleUsers.length + guests.length,
      authCount: visibleUsers.length,
      guestCount: guests.length,
      activeCount,
      idleCount,
      users: formattedUsers,
      guestsByPage,
      guestsByDevice,
      updatedAt: new Date(now).toISOString(),
    };
  };

  const getUsersPresenceMap = async (): Promise<Map<number, UserPresenceBrief>> => {
    const { users } = await readActiveRecords();
    const map = new Map<number, UserPresenceBrief>();
    for (const u of users) {
      map.set(u.userId, { status: u.status, page: u.page });
    }
    return map;
  };

  const getOnlineCounts = async (): Promise<{
    totalOnline: number;
    authCount: number;
    guestCount: number;
  }> => {
    const { users, guests } = await readActiveRecords();
    const authCount = users.filter((u) => !u.isExcluded).length;
    const guestCount = guests.length;
    return {
      totalOnline: authCount + guestCount,
      authCount,
      guestCount,
    };
  };

  return {
    ping,
    leave,
    recordActiveMinuteWithThrottle,
    getOnlineSnapshot,
    getUsersPresenceMap,
    getOnlineCounts,
  };
}
