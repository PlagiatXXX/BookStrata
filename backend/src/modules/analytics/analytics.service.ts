import type { PrismaClient, Prisma } from '@prisma/client'

export interface TrackPayload {
  userId?: number | null
  event: string
  meta?: Record<string, unknown>
  url?: string
  ip?: string
  userAgent?: string
}

export interface AnalyticsEventRow {
  id: string
  userId: number | null
  event: string
  meta: Record<string, unknown> | null
  url: string | null
  ip: string | null
  userAgent: string | null
  createdAt: string
  username: string | null
}

export interface AnalyticsQuery {
  event?: string
  userId?: number
  search?: string
  from?: string
  to?: string
  limit: number
  cursor?: string
}

export interface AnalyticsResult {
  events: AnalyticsEventRow[]
  nextCursor: string | null
  total: number
}

export interface EventCount {
  event: string
  count: number
}

export interface AnalyticsSummary {
  todayTotal: number
  todayByEvent: EventCount[]
  weekTotal: number
  weekByEvent: EventCount[]
}

export function createAnalyticsService(prisma: PrismaClient) {
  const trackEvent = async (payload: TrackPayload): Promise<void> => {
    try {
      await prisma.analyticsEvent.create({
        data: {
          userId: payload.userId ?? null,
          event: payload.event,
          meta: (payload.meta ?? {}) as Prisma.InputJsonValue,
          url: payload.url ?? null,
          ip: payload.ip ?? null,
          userAgent: payload.userAgent ?? null,
        },
      })
    } catch (err) {
      // Тихий лог — аналитика не должна ломать основное приложение
      console.error('[Analytics] Failed to track event:', err)
    }
  }

  const getEvents = async (query: AnalyticsQuery): Promise<AnalyticsResult> => {
    const where: Record<string, unknown> = {}
    const AND: Record<string, unknown>[] = []

    if (query.event) {
      AND.push({ event: query.event })
    }

    if (query.userId) {
      AND.push({ userId: query.userId })
    }

    if (query.search) {
      AND.push({
        OR: [
          { user: { username: { contains: query.search, mode: 'insensitive' } } },
          { event: { contains: query.search, mode: 'insensitive' } },
        ],
      })
    }

    if (query.from) {
      AND.push({ createdAt: { gte: new Date(query.from) } })
    }

    if (query.to) {
      AND.push({ createdAt: { lte: new Date(query.to) } })
    }

    if (AND.length > 0) {
      where.AND = AND
    }

    const take = Math.min(query.limit, 200)

    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where: where as Prisma.AnalyticsEventWhereInput,
        orderBy: { id: 'desc' },
        take: take + 1,
        ...(query.cursor ? { cursor: { id: BigInt(query.cursor) }, skip: 1 } : {}),
        include: {
          user: { select: { username: true } },
        },
      }),
      prisma.analyticsEvent.count({ where: where as Prisma.AnalyticsEventWhereInput }),
    ])

    const hasMore = events.length > take
    const rows = hasMore ? events.slice(0, take) : events

    return {
      events: rows.map((e) => ({
        id: e.id.toString(),
        userId: e.userId,
        event: e.event,
        meta: e.meta as Record<string, unknown> | null,
        url: e.url,
        ip: e.ip,
        userAgent: e.userAgent,
        createdAt: e.createdAt.toISOString(),
        username: (e.user as { username: string | null } | null)?.username ?? null,
      })),
      nextCursor: hasMore && rows.length > 0 ? rows[rows.length - 1]!.id.toString() : null,
      total,
    }
  }

  const getSummary = async (): Promise<AnalyticsSummary> => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)

    const [todayEvents, weekEvents] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { event: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: weekStart } },
        select: { event: true },
      }),
    ])

    const countByEvent = (events: { event: string }[]): EventCount[] => {
      const map = new Map<string, number>()
      for (const { event } of events) {
        map.set(event, (map.get(event) ?? 0) + 1)
      }
      return Array.from(map.entries())
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count)
    }

    return {
      todayTotal: todayEvents.length,
      todayByEvent: countByEvent(todayEvents),
      weekTotal: weekEvents.length,
      weekByEvent: countByEvent(weekEvents),
    }
  }

  return { trackEvent, getEvents, getSummary }
}
