import { apiClient } from './api-client'

export interface AnalyticsEvent {
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

export interface AnalyticsResult {
  events: AnalyticsEvent[]
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

export interface AnalyticsQuery {
  event?: string
  userId?: number
  search?: string
  from?: string
  to?: string
  limit?: number
  cursor?: string
}

export function apiGetAnalytics({ event, userId, search, from, to, limit, cursor }: AnalyticsQuery) {
  const queryParams: Record<string, string | number | boolean | null | undefined> = {
    ...(event && { event }),
    ...(userId !== undefined && { userId }),
    ...(search && { search }),
    ...(from && { from }),
    ...(to && { to }),
    ...(limit !== undefined && { limit }),
    ...(cursor && { cursor }),
  }
  return apiClient.get<AnalyticsResult>('/admin/analytics/events', queryParams)
}

export function apiGetAnalyticsSummary() {
  return apiClient.get<AnalyticsSummary>('/admin/analytics/summary')
}

export function apiGetAnalyticsMetrics() {
  return apiClient.get<MetricsResult>('/admin/analytics/metrics')
}

export function apiGetAnalyticsFunnel(days: number = 30) {
  return apiClient.get<FunnelResult>('/admin/analytics/funnel', { days })
}

export function apiGetAnalyticsRetention() {
  return apiClient.get<RetentionResult>('/admin/analytics/retention')
}

export async function apiTrackEvent(
  event: string,
  meta?: Record<string, unknown>,
  url?: string,
) {
  try {
    await apiClient.post('/analytics/track', { event, meta, url })
  } catch {
    // Тихий fallback — аналитика не должна ломать UX
  }
}
