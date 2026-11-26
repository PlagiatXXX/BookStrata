import { apiClient } from "./api-client";
import { API_BASE_URL } from "./config";
import { getAuthHeader } from "./authApi";
import { getSessionContext } from "./analyticsIdentity";

export interface AnalyticsEvent {
  id: string;
  userId: number | null;
  anonymousId: string | null;
  sessionId: string | null;
  event: string;
  meta: Record<string, unknown> | null;
  url: string | null;
  ip: string | null;
  userAgent: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
  username: string | null;
}

export interface AnalyticsResult {
  events: AnalyticsEvent[];
  nextCursor: string | null;
  total: number;
}

export interface EventCount {
  event: string;
  count: number;
}

export interface AnalyticsSummary {
  todayTotal: number;
  todayByEvent: EventCount[];
  weekTotal: number;
  weekByEvent: EventCount[];
}

export interface MetricsResult {
  dau: number;
  wau?: number;
  mau: number;
  stickiness: number;
  churn: number;
  churnRate: number;
  uniqueVisitorsToday: number;
  deltas?: {
    dauYesterday: number;
    visitorsYesterday: number;
    newUsersToday: number;
    newUsersYesterday: number;
    dauPctChange: number | null;
    visitorsPctChange: number | null;
  };
}

export interface FunnelStage {
  name: string;
  count: number;
  conversionFromPrev?: number | null;
  conversionFromStart?: number | null;
}

export interface FunnelResult {
  stages: FunnelStage[];
  activation?: {
    days: number;
    stages: FunnelStage[];
  };
  acquisition?: {
    days: number;
    stages: FunnelStage[];
  };
}

export interface CohortWindowStat {
  eligible: number;
  retained: number;
  rate: number | null;
}

export interface WeeklyCohortRow {
  weekStart: string;
  cohortSize: number;
  retentionByWeek: Array<number | null>;
}

export interface RetentionResult {
  d1: number | null;
  d7: number | null;
  d30: number | null;
  cohorts?: {
    d1: CohortWindowStat;
    d7: CohortWindowStat;
    d30: CohortWindowStat;
  };
  weeklyMatrix?: WeeklyCohortRow[];
}

export interface TimeseriesPoint {
  date: string;
  visitors: number;
  dau: number;
  registrations: number;
  tierlists: number;
  searches: number;
  aiRequests: number;
}

export interface TimeseriesResult {
  days: number;
  points: TimeseriesPoint[];
}

export interface InsightsResult {
  days: number;
  topPages: Array<{ url: string; views: number; uniqueVisitors: number }>;
  topSearches: Array<{ query: string; count: number; avgResults: number | null }>;
  zeroResultSearches: Array<{ query: string; count: number }>;
  devices: Array<{ deviceType: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  sources: Array<{ source: string; visits: number; uniqueVisitors: number }>;
  features: {
    aiLibrarianMessages: number;
    aiAvatars: number;
    dnaStarted: number;
    dnaSealed: number;
    dnaDuels: number;
    dnaShared: number;
    exportsPng: number;
    shares: number;
    donateOpens: number;
    donateCopies: number;
  };
}

export interface UserJourneyResult {
  user: {
    userId: number;
    username: string;
    avatarUrl: string | null;
    role: string;
    isPro: boolean;
    createdAt: string;
    lastActivityAt: string | null;
    totalActiveMinutes: number;
    tierListsCount: number;
    commentsCount: number;
    likesGivenCount: number;
  } | null;
  anonymousId: string | null;
  firstSource: {
    referrer: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
  } | null;
  devices: string[];
  events: AnalyticsEvent[];
}

export interface AnalyticsQuery {
  event?: string;
  excludeEvents?: string;
  userId?: number;
  anonymousId?: string;
  sessionId?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

export function apiGetAnalytics({
  event,
  excludeEvents,
  userId,
  anonymousId,
  sessionId,
  search,
  from,
  to,
  limit,
  cursor,
}: AnalyticsQuery) {
  const queryParams: Record<string, string | number | boolean | null | undefined> = {
    ...(event && { event }),
    ...(excludeEvents && { excludeEvents }),
    ...(userId !== undefined && { userId }),
    ...(anonymousId && { anonymousId }),
    ...(sessionId && { sessionId }),
    ...(search && { search }),
    ...(from && { from }),
    ...(to && { to }),
    ...(limit !== undefined && { limit }),
    ...(cursor && { cursor }),
  };
  return apiClient.get<AnalyticsResult>("/admin/analytics/events", queryParams);
}

export function apiGetAnalyticsSummary() {
  return apiClient.get<AnalyticsSummary>("/admin/analytics/summary");
}

export function apiGetAnalyticsMetrics() {
  return apiClient.get<MetricsResult>("/admin/analytics/metrics");
}

export function apiGetAnalyticsFunnel(days: number = 30) {
  return apiClient.get<FunnelResult>("/admin/analytics/funnel", { days });
}

export function apiGetAnalyticsRetention() {
  return apiClient.get<RetentionResult>("/admin/analytics/retention");
}

export function apiGetAnalyticsTimeseries(days: number = 30) {
  return apiClient.get<TimeseriesResult>("/admin/analytics/timeseries", { days });
}

export function apiGetAnalyticsInsights(days: number = 30) {
  return apiClient.get<InsightsResult>("/admin/analytics/insights", { days });
}

export function apiGetUserJourney(params: { userId?: number; anonymousId?: string }) {
  return apiClient.get<UserJourneyResult>("/admin/analytics/user-journey", params);
}

// ── Тихая батч-очередь отправки событий (не триггерит UI-ошибки apiClient) ──

interface QueuedAnalyticsItem {
  event: string;
  meta?: Record<string, unknown>;
  url?: string;
  anonymousId: string;
  sessionId: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const BATCH_FLUSH_DELAY_MS = 4000;
const BATCH_MAX_SIZE = 10;
const MAX_BACKEND_BATCH = 20;

let eventQueue: QueuedAnalyticsItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let pagehideBound = false;

function ensurePagehideListener() {
  if (pagehideBound || typeof window === "undefined") return;
  pagehideBound = true;
  window.addEventListener("pagehide", () => {
    void flushAnalyticsQueue();
  });
}

async function sendBatchSilently(items: QueuedAnalyticsItem[]): Promise<void> {
  if (items.length === 0 || typeof fetch !== "function") return;
  try {
    await fetch(`${API_BASE_URL}/analytics/batch`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ events: items }),
    });
  } catch {
    // Тихий fallback — аналитика никогда не должна ломать UX или показывать тосты
  }
}

export async function flushAnalyticsQueue(): Promise<void> {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (eventQueue.length === 0) return;

  const snapshot = eventQueue;
  eventQueue = [];

  for (let i = 0; i < snapshot.length; i += MAX_BACKEND_BATCH) {
    await sendBatchSilently(snapshot.slice(i, i + MAX_BACKEND_BATCH));
  }
}

/** Сброс внутреннего состояния очереди (используется в unit-тестах). */
export function _resetAnalyticsQueueForTests(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  eventQueue = [];
}

export async function apiTrackEvent(
  event: string,
  meta?: Record<string, unknown>,
  url?: string,
) {
  if (typeof window !== "undefined" && window.__PRERENDER__) return;
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  if (event === "session_heartbeat") return;

  ensurePagehideListener();

  const currentUrl =
    url ||
    (typeof window !== "undefined" && window.location
      ? `${window.location.pathname}${window.location.search}`
      : undefined);

  const session = getSessionContext();

  eventQueue.push({
    event,
    ...(meta !== undefined ? { meta } : {}),
    ...(currentUrl !== undefined ? { url: currentUrl } : {}),
    anonymousId: session.anonymousId,
    sessionId: session.sessionId,
    ...(session.referrer ? { referrer: session.referrer } : {}),
    ...(session.utmSource ? { utmSource: session.utmSource } : {}),
    ...(session.utmMedium ? { utmMedium: session.utmMedium } : {}),
    ...(session.utmCampaign ? { utmCampaign: session.utmCampaign } : {}),
  });

  if (eventQueue.length >= BATCH_MAX_SIZE) {
    await flushAnalyticsQueue();
    return;
  }

  if (flushTimer === null) {
    flushTimer = setTimeout(() => {
      void flushAnalyticsQueue();
    }, BATCH_FLUSH_DELAY_MS);
  }
}
