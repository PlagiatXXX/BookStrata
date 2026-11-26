import type { PrismaClient, Prisma } from "@prisma/client";
import { config } from "../../config/env.js";
import { isBotUserAgent, parseUserAgent } from "../../lib/user-agent.js";
import type {
  AnalyticsEventRow,
  AnalyticsQuery,
  AnalyticsResult,
  AnalyticsSummary,
  EventCount,
  FunnelResult,
  InsightsResult,
  MetricsResult,
  RetentionResult,
  TimeseriesResult,
  TrackPayload,
  UserJourneyResult,
} from "./analytics.types.js";
import {
  queryFunnels,
  queryInsights,
  queryMetrics,
  queryRetention,
  queryTimeseries,
  rollupDailyStatsSql,
} from "./analytics.queries.js";

export { isBotUserAgent };
export type * from "./analytics.types.js";

// Исключённые из аналитики пользователи (по username из конфига, CSV).
const EXCLUDED_USERNAMES = config.ANALYTICS_EXCLUDE_USERNAMES.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const excludedUserFilter: Prisma.AnalyticsEventWhereInput | undefined =
  EXCLUDED_USERNAMES.length > 0
    ? { NOT: { user: { username: { in: EXCLUDED_USERNAMES } } } }
    : undefined;

const EXCLUDED_CACHE_TTL_MS = 5 * 60 * 1000;
let excludedUserIdsCache: { ids: Set<number>; expiresAt: number } | null = null;

async function getExcludedUserIds(prisma: PrismaClient): Promise<Set<number>> {
  const now = Date.now();
  if (excludedUserIdsCache && excludedUserIdsCache.expiresAt > now) {
    return excludedUserIdsCache.ids;
  }
  if (EXCLUDED_USERNAMES.length === 0) {
    const empty = new Set<number>();
    excludedUserIdsCache = { ids: empty, expiresAt: now + EXCLUDED_CACHE_TTL_MS };
    return empty;
  }
  const users = await prisma.user.findMany({
    where: { username: { in: EXCLUDED_USERNAMES } },
    select: { id: true },
  });
  const ids = new Set(users.map((u) => u.id));
  excludedUserIdsCache = { ids, expiresAt: now + EXCLUDED_CACHE_TTL_MS };
  return ids;
}

const EVENT_NAME_PATTERN = /^[a-z0-9_.:-]{1,64}$/;
const URL_MAX_LENGTH = 512;
const USER_AGENT_MAX_LENGTH = 256;
const META_MAX_SERIALIZED_LENGTH = 2048;
const SHORT_STRING_MAX_LENGTH = 128;
const REFERRER_MAX_LENGTH = 512;

const DROPPED_EVENTS = new Set(["session_heartbeat"]);

export function isValidEventName(event: string): boolean {
  return EVENT_NAME_PATTERN.test(event);
}

export function getMoscowDayStart(date: Date = new Date()): Date {
  const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
  const mskTime = new Date(date.getTime() + MSK_OFFSET_MS);
  const mskMidnightUtc = Date.UTC(
    mskTime.getUTCFullYear(),
    mskTime.getUTCMonth(),
    mskTime.getUTCDate(),
  );
  return new Date(mskMidnightUtc - MSK_OFFSET_MS);
}

export function parseMoscowDateBound(value: string, bound: "start" | "end"): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const suffix = bound === "start" ? "T00:00:00.000+03:00" : "T23:59:59.999+03:00";
    const parsed = new Date(`${value}${suffix}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function truncate(val: string | null | undefined, max: number): string | null {
  if (!val) return null;
  return val.length > max ? val.slice(0, max) : val;
}

function sanitizeMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta || typeof meta !== "object") return {};
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    safe[key] = value;
  }
  let serialized = JSON.stringify(safe);
  if (serialized.length > META_MAX_SERIALIZED_LENGTH) {
    const truncated: Record<string, unknown> = { truncated: true };
    for (const [key, value] of Object.entries(safe)) {
      const candidate = { ...truncated, [key]: value };
      const candidateJson = JSON.stringify(candidate);
      if (candidateJson.length > META_MAX_SERIALIZED_LENGTH) break;
      truncated[key] = value;
    }
    serialized = JSON.stringify(truncated);
  }
  return JSON.parse(serialized) as Record<string, unknown>;
}

function isForeignKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2003"
  );
}

function buildEventData(payload: TrackPayload) {
  const parsedUa = parseUserAgent(payload.userAgent);
  return {
    userId: payload.userId ?? null,
    anonymousId: truncate(payload.anonymousId, SHORT_STRING_MAX_LENGTH),
    sessionId: truncate(payload.sessionId, SHORT_STRING_MAX_LENGTH),
    event: payload.event,
    meta: sanitizeMeta(payload.meta) as Prisma.InputJsonValue,
    url: truncate(payload.url, URL_MAX_LENGTH),
    ip: payload.ip ?? null,
    userAgent: truncate(payload.userAgent, USER_AGENT_MAX_LENGTH),
    deviceType: parsedUa.deviceType,
    browser: parsedUa.browser,
    os: parsedUa.os,
    referrer: truncate(payload.referrer, REFERRER_MAX_LENGTH),
    utmSource: truncate(payload.utmSource, SHORT_STRING_MAX_LENGTH),
    utmMedium: truncate(payload.utmMedium, SHORT_STRING_MAX_LENGTH),
    utmCampaign: truncate(payload.utmCampaign, SHORT_STRING_MAX_LENGTH),
  };
}

function mapEventRow(e: {
  id: bigint;
  userId: number | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  event: string;
  meta: unknown;
  url: string | null;
  ip: string | null;
  userAgent: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  createdAt: Date;
  user?: { username: string | null } | null;
}): AnalyticsEventRow {
  return {
    id: e.id.toString(),
    userId: e.userId,
    anonymousId: e.anonymousId ?? null,
    sessionId: e.sessionId ?? null,
    event: e.event,
    meta: e.meta as Record<string, unknown> | null,
    url: e.url,
    ip: e.ip,
    userAgent: e.userAgent,
    deviceType: e.deviceType ?? null,
    browser: e.browser ?? null,
    os: e.os ?? null,
    referrer: e.referrer ?? null,
    utmSource: e.utmSource ?? null,
    utmMedium: e.utmMedium ?? null,
    utmCampaign: e.utmCampaign ?? null,
    createdAt: e.createdAt.toISOString(),
    username: e.user?.username ?? null,
  };
}

export function createAnalyticsService(prisma: PrismaClient) {
  const isTrackable = async (payload: TrackPayload): Promise<boolean> => {
    if (DROPPED_EVENTS.has(payload.event)) return false;
    if (!isValidEventName(payload.event)) return false;
    if (isBotUserAgent(payload.userAgent)) return false;
    if (payload.userId) {
      const excludedIds = await getExcludedUserIds(prisma);
      if (excludedIds.has(payload.userId)) return false;
    }
    return true;
  };

  const trackEvent = async (payload: TrackPayload): Promise<void> => {
    try {
      if (!(await isTrackable(payload))) return;

      const data = buildEventData(payload);
      try {
        await prisma.analyticsEvent.create({ data });
      } catch (err) {
        if (data.userId && isForeignKeyError(err)) {
          await prisma.analyticsEvent.create({ data: { ...data, userId: null } });
          return;
        }
        throw err;
      }
    } catch (err) {
      console.error("[Analytics] Failed to track event:", err);
    }
  };

  const trackBatch = async (payloads: TrackPayload[]): Promise<void> => {
    try {
      const rows = [];
      for (const item of payloads) {
        if (await isTrackable(item)) {
          rows.push(buildEventData(item));
        }
      }
      if (rows.length === 0) return;

      if (typeof prisma.analyticsEvent.createMany === "function") {
        try {
          await prisma.analyticsEvent.createMany({ data: rows });
          return;
        } catch (err) {
          if (isForeignKeyError(err)) {
            await prisma.analyticsEvent.createMany({
              data: rows.map((r) => ({ ...r, userId: null })),
            });
            return;
          }
          throw err;
        }
      }

      await Promise.all(rows.map((data) => prisma.analyticsEvent.create({ data })));
    } catch (err) {
      console.error("[Analytics] Failed to track batch:", err);
    }
  };

  const getEvents = async (query: AnalyticsQuery): Promise<AnalyticsResult> => {
    const where: Record<string, unknown> = {};
    const AND: Record<string, unknown>[] = [];

    if (query.event) {
      AND.push({ event: query.event });
    } else if (query.excludeEvents && query.excludeEvents.length > 0) {
      AND.push({ event: { notIn: query.excludeEvents } });
    }

    if (query.userId) AND.push({ userId: query.userId });
    if (query.anonymousId) AND.push({ anonymousId: query.anonymousId });
    if (query.sessionId) AND.push({ sessionId: query.sessionId });

    if (query.search) {
      AND.push({
        OR: [
          { user: { username: { contains: query.search, mode: "insensitive" } } },
          { event: { contains: query.search, mode: "insensitive" } },
          { url: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }

    if (query.from) {
      const fromDate = parseMoscowDateBound(query.from, "start");
      if (fromDate) AND.push({ createdAt: { gte: fromDate } });
    }

    if (query.to) {
      const toDate = parseMoscowDateBound(query.to, "end");
      if (toDate) AND.push({ createdAt: { lte: toDate } });
    }

    if (excludedUserFilter) {
      AND.push(excludedUserFilter);
    }

    if (AND.length > 0) {
      where.AND = AND;
    }

    const take = Math.min(query.limit, 200);
    const validCursor = query.cursor && /^\d+$/.test(query.cursor) ? query.cursor : undefined;

    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where: where as Prisma.AnalyticsEventWhereInput,
        orderBy: { id: "desc" },
        take: take + 1,
        ...(validCursor ? { cursor: { id: BigInt(validCursor) }, skip: 1 } : {}),
        include: {
          user: { select: { username: true } },
        },
      }),
      prisma.analyticsEvent.count({ where: where as Prisma.AnalyticsEventWhereInput }),
    ]);

    const hasMore = events.length > take;
    const rows = hasMore ? events.slice(0, take) : events;

    return {
      events: rows.map(mapEventRow),
      nextCursor: hasMore && rows.length > 0 ? rows[rows.length - 1]!.id.toString() : null,
      total,
    };
  };

  const getSummary = async (): Promise<AnalyticsSummary> => {
    const now = new Date();
    const todayStart = getMoscowDayStart(now);
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    const mapGroupByResult = (
      rows: { event: string; _count: { event: number } }[],
    ): EventCount[] =>
      rows
        .map((r) => ({ event: r.event, count: r._count.event }))
        .sort((a, b) => b.count - a.count);

    const [todayTotal, todayByEvent, weekTotal, weekByEvent] = await Promise.all([
      prisma.analyticsEvent.count({ where: { createdAt: { gte: todayStart }, ...excludedUserFilter } }),
      prisma.analyticsEvent.groupBy({
        by: ["event"],
        where: { createdAt: { gte: todayStart }, ...excludedUserFilter },
        _count: { event: true },
        orderBy: { _count: { event: "desc" } },
      }),
      prisma.analyticsEvent.count({ where: { createdAt: { gte: weekStart }, ...excludedUserFilter } }),
      prisma.analyticsEvent.groupBy({
        by: ["event"],
        where: { createdAt: { gte: weekStart }, ...excludedUserFilter },
        _count: { event: true },
        orderBy: { _count: { event: "desc" } },
      }),
    ]);

    return {
      todayTotal,
      todayByEvent: mapGroupByResult(todayByEvent),
      weekTotal,
      weekByEvent: mapGroupByResult(weekByEvent),
    };
  };

  const rollupDailyStats = async (daysBack: number = 2): Promise<void> => {
    try {
      const excludedIds = [...(await getExcludedUserIds(prisma))];
      await rollupDailyStatsSql(prisma, excludedIds, daysBack);
    } catch (err) {
      console.error("[Analytics] Daily rollup failed:", err);
    }
  };

  const cleanupOldEvents = async (daysToKeep: number = 90): Promise<number> => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    try {
      // Перед удалением сворачиваем вчерашние/недавние дни в долгосрочную таблицу
      await rollupDailyStats(3);
      const result = await prisma.analyticsEvent.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        console.log(`[Analytics] Cleaned up ${result.count} events older than ${daysToKeep} days`);
      }
      return result.count;
    } catch (err) {
      console.error("[Analytics] Cleanup failed:", err);
      return 0;
    }
  };

  const getMetrics = async (): Promise<MetricsResult> => {
    const excludedIds = [...(await getExcludedUserIds(prisma))];
    return queryMetrics(prisma, excludedIds);
  };

  const getFunnel = async (days: number = 30): Promise<FunnelResult> => {
    const excludedIds = [...(await getExcludedUserIds(prisma))];
    return queryFunnels(prisma, excludedIds, days);
  };

  const getRetention = async (): Promise<RetentionResult> => {
    const excludedIds = [...(await getExcludedUserIds(prisma))];
    return queryRetention(prisma, excludedIds);
  };

  const getTimeseries = async (days: number = 30): Promise<TimeseriesResult> => {
    const excludedIds = [...(await getExcludedUserIds(prisma))];
    const points = await queryTimeseries(prisma, excludedIds, days);
    return { days, points };
  };

  const getInsights = async (days: number = 30): Promise<InsightsResult> => {
    const excludedIds = [...(await getExcludedUserIds(prisma))];
    return queryInsights(prisma, excludedIds, days);
  };

  const getUserJourney = async (params: {
    userId?: number;
    anonymousId?: string;
  }): Promise<UserJourneyResult> => {
    const { userId, anonymousId } = params;

    let userSummary: UserJourneyResult["user"] = null;
    const anonIds = new Set<string>();
    if (anonymousId) anonIds.add(anonymousId);

    if (userId) {
      const [dbUser, linkedAnons] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            isPro: true,
            createdAt: true,
            lastActivityAt: true,
            totalActiveMinutes: true,
            role: { select: { name: true } },
            _count: {
              select: {
                tierLists: true,
                bookComments: true,
                tierListLikes: true,
              },
            },
          },
        }),
        prisma.analyticsEvent.findMany({
          where: { userId, anonymousId: { not: null } },
          select: { anonymousId: true },
          distinct: ["anonymousId"],
          take: 10,
        }),
      ]);

      if (dbUser) {
        userSummary = {
          userId: dbUser.id,
          username: dbUser.username,
          avatarUrl: dbUser.avatarUrl,
          role: dbUser.role?.name ?? "user",
          isPro: dbUser.isPro,
          createdAt: dbUser.createdAt.toISOString(),
          lastActivityAt: dbUser.lastActivityAt?.toISOString() ?? null,
          totalActiveMinutes: dbUser.totalActiveMinutes,
          tierListsCount: dbUser._count.tierLists,
          commentsCount: dbUser._count.bookComments,
          likesGivenCount: dbUser._count.tierListLikes,
        };
      }

      for (const row of linkedAnons) {
        if (row.anonymousId) anonIds.add(row.anonymousId);
      }
    }

    const anonList = [...anonIds];
    const orFilters: Prisma.AnalyticsEventWhereInput[] = [];
    if (userId) orFilters.push({ userId });
    if (anonList.length > 0) orFilters.push({ anonymousId: { in: anonList } });

    if (orFilters.length === 0) {
      return {
        user: userSummary,
        anonymousId: anonymousId ?? null,
        firstSource: null,
        devices: [],
        events: [],
      };
    }

    const [events, firstSourceRow] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where: { OR: orFilters },
        orderBy: { id: "desc" },
        take: 100,
        include: { user: { select: { username: true } } },
      }),
      prisma.analyticsEvent.findFirst({
        where: {
          OR: [
            ...(userId ? [{ userId }] : []),
            ...(anonList.length > 0 ? [{ anonymousId: { in: anonList } }] : []),
          ],
          AND: [
            {
              OR: [
                { referrer: { not: null } },
                { utmSource: { not: null } },
              ],
            },
          ],
        },
        orderBy: { id: "asc" },
        select: {
          referrer: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      }),
    ]);

    const deviceSet = new Set<string>();
    for (const e of events) {
      if (e.deviceType) {
        deviceSet.add(e.browser ? `${e.deviceType} (${e.browser})` : e.deviceType);
      }
    }

    return {
      user: userSummary,
      anonymousId: anonList[0] ?? null,
      firstSource: firstSourceRow
        ? {
            referrer: firstSourceRow.referrer,
            utmSource: firstSourceRow.utmSource,
            utmMedium: firstSourceRow.utmMedium,
            utmCampaign: firstSourceRow.utmCampaign,
          }
        : null,
      devices: [...deviceSet],
      events: events.map(mapEventRow),
    };
  };

  return {
    trackEvent,
    trackBatch,
    getEvents,
    getSummary,
    rollupDailyStats,
    cleanupOldEvents,
    getMetrics,
    getFunnel,
    getRetention,
    getTimeseries,
    getInsights,
    getUserJourney,
  };
}
