export interface TrackPayload {
  userId?: number | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  event: string;
  meta?: Record<string, unknown>;
  url?: string;
  ip?: string;
  userAgent?: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface AnalyticsEventRow {
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

export interface AnalyticsQuery {
  event?: string;
  excludeEvents?: string[];
  userId?: number;
  anonymousId?: string;
  sessionId?: string;
  search?: string;
  from?: string;
  to?: string;
  limit: number;
  cursor?: string;
}

export interface AnalyticsResult {
  events: AnalyticsEventRow[];
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
  wau: number;
  mau: number;
  stickiness: number;
  churn: number;
  churnRate: number;
  uniqueVisitorsToday: number;
  deltas: {
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
  activation: {
    days: number;
    stages: FunnelStage[];
  };
  acquisition: {
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
  cohorts: {
    d1: CohortWindowStat;
    d7: CohortWindowStat;
    d30: CohortWindowStat;
  };
  weeklyMatrix: WeeklyCohortRow[];
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
  events: AnalyticsEventRow[];
}
