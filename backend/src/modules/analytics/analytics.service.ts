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

export interface MetricsResult {
  dau: number
  mau: number
  stickiness: number
  churn: number
  churnRate: number
}

export interface FunnelStage {
  name: string
  count: number
}

export interface FunnelResult {
  stages: FunnelStage[]
}

export interface RetentionResult {
  d1: number
  d7: number
  d30: number
}

const RETENTION_EVENTS = [
  'page_view', 'session_heartbeat', 'tierlist_create',
  'tierlist_fork', 'tierlist_like', 'book_add',
  'book_search', 'export_png',
]

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

  // Фикс: GROUP BY на уровне БД вместо full scan + JS Map
  const getSummary = async (): Promise<AnalyticsSummary> => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)

    const mapGroupByResult = (
      rows: { event: string; _count: { event: number } }[],
    ): EventCount[] =>
      rows
        .map((r) => ({ event: r.event, count: r._count.event }))
        .sort((a, b) => b.count - a.count)

    const [todayTotal, todayByEvent, weekTotal, weekByEvent] = await Promise.all([
      prisma.analyticsEvent.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.analyticsEvent.groupBy({
        by: ['event'],
        where: { createdAt: { gte: todayStart } },
        _count: { event: true },
        orderBy: { _count: { event: 'desc' } },
      }),
      prisma.analyticsEvent.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.analyticsEvent.groupBy({
        by: ['event'],
        where: { createdAt: { gte: weekStart } },
        _count: { event: true },
        orderBy: { _count: { event: 'desc' } },
      }),
    ])

    return {
      todayTotal,
      todayByEvent: mapGroupByResult(todayByEvent),
      weekTotal,
      weekByEvent: mapGroupByResult(weekByEvent),
    }
  }

  // Очистка событий старше N дней
  const cleanupOldEvents = async (daysToKeep: number = 30): Promise<number> => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysToKeep)

    try {
      const result = await prisma.analyticsEvent.deleteMany({
        where: { createdAt: { lt: cutoff } },
      })
      if (result.count > 0) {
        console.log(`[Analytics] Cleaned up ${result.count} events older than ${daysToKeep} days`)
      }
      return result.count
    } catch (err) {
      console.error('[Analytics] Cleanup failed:', err)
      return 0
    }
  }

  // DAU, MAU, Stickiness, Churn
  const getMetrics = async (): Promise<MetricsResult> => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const last30Start = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000)
    const prev30Start = new Date(todayStart.getTime() - 59 * 24 * 60 * 60 * 1000)
    const prev30End = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [dau, mau, prevActiveUsers] = await Promise.all([
      // DAU: уникальные userId за сегодня (не null)
      prisma.analyticsEvent.findMany({
        where: { userId: { not: null }, createdAt: { gte: todayStart } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // MAU: уникальные userId за последние 30 дней
      prisma.analyticsEvent.findMany({
        where: { userId: { not: null }, createdAt: { gte: last30Start } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // Пользователи, активные в предыдущие 30 дней (31-60 дней назад)
      prisma.analyticsEvent.findMany({
        where: { userId: { not: null }, createdAt: { gte: prev30Start, lt: last30Start } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ])

    const dauCount = dau.length
    const mauCount = mau.length
    const prevActiveIds = new Set(prevActiveUsers.map((u) => u.userId))

    // Churn: пользователи, активные в предыдущие 30 дней, но не в последние 30
    const currentActiveIds = new Set(mau.map((u) => u.userId))
    let churnedCount = 0
    for (const id of prevActiveIds) {
      if (!currentActiveIds.has(id)) churnedCount++
    }

    const churn = prevActiveIds.size > 0 ? churnedCount / prevActiveIds.size : 0
    const stickiness = mauCount > 0 ? dauCount / mauCount : 0

    return {
      dau: dauCount,
      mau: mauCount,
      stickiness: Math.round(stickiness * 10000) / 100, // в процентах, 2 знака
      churn: churnedCount,
      churnRate: Math.round(churn * 10000) / 100,
    }
  }

  // Воронка: регистрация → создание → публикация → шейринг
  const getFunnel = async (days: number = 30): Promise<FunnelResult> => {
    const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : new Date(0)

    const countUsersWithEvent = async (event: string): Promise<number> => {
      const rows = await prisma.analyticsEvent.findMany({
        where: { event, userId: { not: null }, createdAt: { gte: since } },
        select: { userId: true },
        distinct: ['userId'],
      })
      return rows.length
    }

    const stages: FunnelStage[] = [
      { name: 'Регистрация', count: await countUsersWithEvent('user_register') },
      { name: 'Создание тир-листа', count: await countUsersWithEvent('tierlist_create') },
      { name: 'Публикация', count: await countUsersWithEvent('tierlist_publish') },
      { name: 'Поделились', count: await countUsersWithEvent('share_clicked') },
    ]

    return { stages }
  }

  // Retention D1/D7/D30
  const getRetention = async (): Promise<RetentionResult> => {
    const now = new Date()

    const countRetained = async (daysAfter: number): Promise<number> => {
      // Пользователи, которые зарегистрировались достаточно давно (чтобы прошло daysAfter дней)
      const since = new Date(now.getTime() - daysAfter * 24 * 60 * 60 * 1000)

      // Находим пользователей, зарегистрировавшихся после since и до daysAfter+1 день назад
      const registeredBefore = new Date(now.getTime() - (daysAfter + 1) * 24 * 60 * 60 * 1000)

      const registrations = await prisma.analyticsEvent.findMany({
        where: {
          event: 'user_register',
          userId: { not: null },
          createdAt: { gte: registeredBefore, lt: since },
        },
        select: { userId: true, createdAt: true },
        distinct: ['userId'],
      })

      if (registrations.length === 0) return 0

      let retained = 0
      for (const reg of registrations) {
        const targetDayStart = new Date(reg.createdAt.getTime() + daysAfter * 24 * 60 * 60 * 1000)
        const targetDayEnd = new Date(targetDayStart.getTime() + 24 * 60 * 60 * 1000)

        const activity = await prisma.analyticsEvent.findFirst({
          where: {
            userId: reg.userId!,
            event: { in: RETENTION_EVENTS },
            createdAt: { gte: targetDayStart, lt: targetDayEnd },
          },
        })
        if (activity) retained++
      }

      return Math.round((retained / registrations.length) * 10000) / 100
    }

    const [d1, d7, d30] = await Promise.all([
      countRetained(1),
      countRetained(7),
      countRetained(30),
    ])

    return { d1, d7, d30 }
  }

  return { trackEvent, getEvents, getSummary, cleanupOldEvents, getMetrics, getFunnel, getRetention }
}
