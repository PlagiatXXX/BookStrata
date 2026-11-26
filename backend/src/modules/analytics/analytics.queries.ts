import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  CohortWindowStat,
  FunnelResult,
  FunnelStage,
  InsightsResult,
  MetricsResult,
  RetentionResult,
  TimeseriesPoint,
  WeeklyCohortRow,
} from "./analytics.types.js";

function excludedEventsFilterSql(excludedIds: number[], alias = "ae"): Prisma.Sql {
  if (excludedIds.length === 0) return Prisma.empty;
  const col = Prisma.raw(`${alias}."userId"`);
  return Prisma.sql`AND (${col} IS NULL OR ${col} NOT IN (${Prisma.join(excludedIds)}))`;
}

function excludedUsersFilterSql(excludedIds: number[], alias = "u"): Prisma.Sql {
  if (excludedIds.length === 0) return Prisma.empty;
  const col = Prisma.raw(`${alias}."id"`);
  return Prisma.sql`AND ${col} NOT IN (${Prisma.join(excludedIds)})`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function calcRate(retained: number, eligible: number): number | null {
  if (eligible === 0) return null;
  return Math.round((retained / eligible) * 10000) / 100;
}

function enrichFunnelStages(rawStages: Array<{ name: string; count: number }>): FunnelStage[] {
  const firstCount = rawStages[0]?.count ?? 0;
  return rawStages.map((s, idx) => {
    const prevCount = idx > 0 ? rawStages[idx - 1]!.count : 0;
    return {
      name: s.name,
      count: s.count,
      conversionFromPrev:
        idx > 0 && prevCount > 0 ? Math.round((s.count / prevCount) * 1000) / 10 : null,
      conversionFromStart:
        idx > 0 && firstCount > 0 ? Math.round((s.count / firstCount) * 1000) / 10 : null,
    };
  });
}

export async function queryMetrics(
  prisma: PrismaClient,
  excludedIds: number[],
): Promise<MetricsResult> {
  const evFilter = excludedEventsFilterSql(excludedIds, "ae");
  const uFilter = excludedUsersFilterSql(excludedIds, "u");

  const [eventRows, regRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        dau: bigint;
        dau_yesterday: bigint;
        wau: bigint;
        mau: bigint;
        prev_mau: bigint;
        retained_from_prev_mau: bigint;
        visitors_today: bigint;
        visitors_yesterday: bigint;
      }>
    >`
      WITH msk_bounds AS (
        SELECT
          (NOW() AT TIME ZONE 'Europe/Moscow')::date AS today_msk
      ),
      user_windows AS (
        SELECT
          ae."userId",
          BOOL_OR((ae."created_at" AT TIME ZONE 'Europe/Moscow')::date = b.today_msk) AS active_today,
          BOOL_OR((ae."created_at" AT TIME ZONE 'Europe/Moscow')::date = b.today_msk - 1) AS active_yesterday,
          BOOL_OR((ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= b.today_msk - 6) AS active_7d,
          BOOL_OR((ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= b.today_msk - 29) AS active_30d,
          BOOL_OR(
            (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= b.today_msk - 59
            AND (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date < b.today_msk - 29
          ) AS active_prev_30d
        FROM "analytics_events" ae
        CROSS JOIN msk_bounds b
        WHERE ae."userId" IS NOT NULL
          AND (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= b.today_msk - 59
          ${evFilter}
        GROUP BY ae."userId"
      ),
      visitors AS (
        SELECT
          COUNT(DISTINCT COALESCE(ae."anonymous_id", ae."ip")) FILTER (
            WHERE (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date = b.today_msk
          ) AS visitors_today,
          COUNT(DISTINCT COALESCE(ae."anonymous_id", ae."ip")) FILTER (
            WHERE (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date = b.today_msk - 1
          ) AS visitors_yesterday
        FROM "analytics_events" ae
        CROSS JOIN msk_bounds b
        WHERE COALESCE(ae."anonymous_id", ae."ip") IS NOT NULL
          AND (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= b.today_msk - 1
          ${evFilter}
      )
      SELECT
        COALESCE((SELECT COUNT(*) FILTER (WHERE active_today) FROM user_windows), 0) AS dau,
        COALESCE((SELECT COUNT(*) FILTER (WHERE active_yesterday) FROM user_windows), 0) AS dau_yesterday,
        COALESCE((SELECT COUNT(*) FILTER (WHERE active_7d) FROM user_windows), 0) AS wau,
        COALESCE((SELECT COUNT(*) FILTER (WHERE active_30d) FROM user_windows), 0) AS mau,
        COALESCE((SELECT COUNT(*) FILTER (WHERE active_prev_30d) FROM user_windows), 0) AS prev_mau,
        COALESCE((SELECT COUNT(*) FILTER (WHERE active_prev_30d AND active_30d) FROM user_windows), 0) AS retained_from_prev_mau,
        COALESCE((SELECT visitors_today FROM visitors), 0) AS visitors_today,
        COALESCE((SELECT visitors_yesterday FROM visitors), 0) AS visitors_yesterday
    `,
    prisma.$queryRaw<Array<{ new_today: bigint; new_yesterday: bigint }>>`
      WITH msk_bounds AS (
        SELECT (NOW() AT TIME ZONE 'Europe/Moscow')::date AS today_msk
      )
      SELECT
        COUNT(*) FILTER (WHERE (u."created_at" AT TIME ZONE 'Europe/Moscow')::date = b.today_msk) AS new_today,
        COUNT(*) FILTER (WHERE (u."created_at" AT TIME ZONE 'Europe/Moscow')::date = b.today_msk - 1) AS new_yesterday
      FROM "User" u
      CROSS JOIN msk_bounds b
      WHERE (u."created_at" AT TIME ZONE 'Europe/Moscow')::date >= b.today_msk - 1
        ${uFilter}
    `,
  ]);

  const row = eventRows[0];
  const reg = regRows[0];

  const dau = Number(row?.dau ?? 0);
  const dauYesterday = Number(row?.dau_yesterday ?? 0);
  const wau = Number(row?.wau ?? 0);
  const mau = Number(row?.mau ?? 0);
  const prevMau = Number(row?.prev_mau ?? 0);
  const retainedFromPrevMau = Number(row?.retained_from_prev_mau ?? 0);
  const uniqueVisitorsToday = Number(row?.visitors_today ?? 0);
  const visitorsYesterday = Number(row?.visitors_yesterday ?? 0);
  const newUsersToday = Number(reg?.new_today ?? 0);
  const newUsersYesterday = Number(reg?.new_yesterday ?? 0);

  const churn = Math.max(0, prevMau - retainedFromPrevMau);
  const churnRate = prevMau > 0 ? Math.round((churn / prevMau) * 10000) / 100 : 0;
  const stickiness = mau > 0 ? Math.round((dau / mau) * 10000) / 100 : 0;

  return {
    dau,
    wau,
    mau,
    stickiness,
    churn,
    churnRate,
    uniqueVisitorsToday,
    deltas: {
      dauYesterday,
      visitorsYesterday,
      newUsersToday,
      newUsersYesterday,
      dauPctChange: pctChange(dau, dauYesterday),
      visitorsPctChange: pctChange(uniqueVisitorsToday, visitorsYesterday),
    },
  };
}

export async function queryFunnels(
  prisma: PrismaClient,
  excludedIds: number[],
  days: number,
): Promise<FunnelResult> {
  const safeDays = Math.max(1, Math.min(days, 365));
  const evFilter = excludedEventsFilterSql(excludedIds, "ae");
  const uFilter = excludedUsersFilterSql(excludedIds, "u");

  const [activationRows, acquisitionRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{ step1: bigint; step2: bigint; step3: bigint; step4: bigint }>
    >`
      WITH cohort AS (
        SELECT u."id", u."created_at" AS reg_at
        FROM "User" u
        WHERE u."created_at" >= NOW() - (${safeDays} * INTERVAL '1 day')
          ${uFilter}
      ),
      step2 AS (
        SELECT c."id", MIN(ae."created_at") AS at
        FROM cohort c
        JOIN "analytics_events" ae ON ae."userId" = c."id"
        WHERE ae."event" = 'tierlist_create'
          AND ae."created_at" >= c.reg_at
        GROUP BY c."id"
      ),
      step3 AS (
        SELECT s2."id", MIN(ae."created_at") AS at
        FROM step2 s2
        JOIN "analytics_events" ae ON ae."userId" = s2."id"
        WHERE ae."event" IN ('book_placed', 'tierlist_save', 'book_add')
          AND ae."created_at" >= s2.at
        GROUP BY s2."id"
      ),
      step4 AS (
        SELECT s3."id", MIN(ae."created_at") AS at
        FROM step3 s3
        JOIN "analytics_events" ae ON ae."userId" = s3."id"
        WHERE ae."event" IN ('tierlist_publish', 'export_png', 'share_clicked')
          AND ae."created_at" >= s3.at
        GROUP BY s3."id"
      )
      SELECT
        (SELECT COUNT(*) FROM cohort) AS step1,
        (SELECT COUNT(*) FROM step2) AS step2,
        (SELECT COUNT(*) FROM step3) AS step3,
        (SELECT COUNT(*) FROM step4) AS step4
    `,
    prisma.$queryRaw<
      Array<{ step1: bigint; step2: bigint; step3: bigint; step4: bigint }>
    >`
      WITH visitors AS (
        SELECT ae."anonymous_id", MIN(ae."created_at") AS at
        FROM "analytics_events" ae
        WHERE ae."anonymous_id" IS NOT NULL
          AND ae."created_at" >= NOW() - (${safeDays} * INTERVAL '1 day')
          AND ae."event" IN ('session_start', 'page_view')
          ${evFilter}
        GROUP BY ae."anonymous_id"
      ),
      engaged AS (
        SELECT v."anonymous_id", MIN(ae."created_at") AS at
        FROM visitors v
        JOIN "analytics_events" ae ON ae."anonymous_id" = v."anonymous_id"
        WHERE ae."created_at" >= v.at
          AND (
            ae."event" LIKE 'cta.landing.try_template_%'
            OR ae."event" IN ('cta.landing.start_free_hero', 'cta.landing.try_reading_dna', 'dna_started', 'book_search', 'tierlist_create')
          )
        GROUP BY v."anonymous_id"
      ),
      auth_intent AS (
        SELECT e."anonymous_id", MIN(ae."created_at") AS at
        FROM engaged e
        JOIN "analytics_events" ae ON ae."anonymous_id" = e."anonymous_id"
        WHERE ae."created_at" >= e.at
          AND ae."event" IN (
            'auth.register_landing', 'auth.tab_register', 'auth.submit_register',
            'auth.login_landing', 'auth.login_header', 'cta.landing.register_after_try',
            'cta.landing.create_account_final'
          )
        GROUP BY e."anonymous_id"
      ),
      registered AS (
        SELECT ai."anonymous_id", MIN(ae."created_at") AS at
        FROM auth_intent ai
        JOIN "analytics_events" ae ON ae."anonymous_id" = ai."anonymous_id"
        WHERE ae."created_at" >= ai.at
          AND ae."event" = 'user_register'
        GROUP BY ai."anonymous_id"
      )
      SELECT
        (SELECT COUNT(*) FROM visitors) AS step1,
        (SELECT COUNT(*) FROM engaged) AS step2,
        (SELECT COUNT(*) FROM auth_intent) AS step3,
        (SELECT COUNT(*) FROM registered) AS step4
    `,
  ]);

  const act = activationRows[0];
  const acq = acquisitionRows[0];

  const activationStages = enrichFunnelStages([
    { name: "Регистрация", count: Number(act?.step1 ?? 0) },
    { name: "Создание тир-листа", count: Number(act?.step2 ?? 0) },
    { name: "Наполнение / сохранение", count: Number(act?.step3 ?? 0) },
    { name: "Публикация / PNG / Шейр", count: Number(act?.step4 ?? 0) },
  ]);

  const acquisitionStages = enrichFunnelStages([
    { name: "Визит на сайт", count: Number(acq?.step1 ?? 0) },
    { name: "Взаимодействие с фичей", count: Number(acq?.step2 ?? 0) },
    { name: "Переход к регистрации", count: Number(acq?.step3 ?? 0) },
    { name: "Завершил регистрацию", count: Number(acq?.step4 ?? 0) },
  ]);

  return {
    stages: activationStages,
    activation: { days: safeDays, stages: activationStages },
    acquisition: { days: safeDays, stages: acquisitionStages },
  };
}

export async function queryRetention(
  prisma: PrismaClient,
  excludedIds: number[],
): Promise<RetentionResult> {
  const uFilter = excludedUsersFilterSql(excludedIds, "u");

  const [dayCohortRows, weeklyRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        d1_eligible: bigint;
        d1_retained: bigint;
        d7_eligible: bigint;
        d7_retained: bigint;
        d30_eligible: bigint;
        d30_retained: bigint;
      }>
    >`
      WITH msk AS (
        SELECT (NOW() AT TIME ZONE 'Europe/Moscow')::date AS today_msk
      ),
      regs AS (
        SELECT
          u."id",
          (u."created_at" AT TIME ZONE 'Europe/Moscow')::date AS reg_date
        FROM "User" u
        CROSS JOIN msk
        WHERE (u."created_at" AT TIME ZONE 'Europe/Moscow')::date >= msk.today_msk - 60
          ${uFilter}
      ),
      active_days AS (
        SELECT DISTINCT
          ae."userId",
          (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date AS act_date
        FROM "analytics_events" ae
        CROSS JOIN msk
        WHERE ae."userId" IS NOT NULL
          AND (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= msk.today_msk - 60
      ),
      flags AS (
        SELECT
          r."id",
          r.reg_date,
          EXISTS(SELECT 1 FROM active_days ad WHERE ad."userId" = r."id" AND ad.act_date = r.reg_date + 1) AS hit_d1,
          EXISTS(SELECT 1 FROM active_days ad WHERE ad."userId" = r."id" AND ad.act_date = r.reg_date + 7) AS hit_d7,
          EXISTS(SELECT 1 FROM active_days ad WHERE ad."userId" = r."id" AND ad.act_date = r.reg_date + 30) AS hit_d30
        FROM regs r
      )
      SELECT
        COUNT(*) FILTER (WHERE f.reg_date <= msk.today_msk - 1 AND f.reg_date >= msk.today_msk - 30) AS d1_eligible,
        COUNT(*) FILTER (WHERE f.reg_date <= msk.today_msk - 1 AND f.reg_date >= msk.today_msk - 30 AND f.hit_d1) AS d1_retained,
        COUNT(*) FILTER (WHERE f.reg_date <= msk.today_msk - 7 AND f.reg_date >= msk.today_msk - 37) AS d7_eligible,
        COUNT(*) FILTER (WHERE f.reg_date <= msk.today_msk - 7 AND f.reg_date >= msk.today_msk - 37 AND f.hit_d7) AS d7_retained,
        COUNT(*) FILTER (WHERE f.reg_date <= msk.today_msk - 30 AND f.reg_date >= msk.today_msk - 60) AS d30_eligible,
        COUNT(*) FILTER (WHERE f.reg_date <= msk.today_msk - 30 AND f.reg_date >= msk.today_msk - 60 AND f.hit_d30) AS d30_retained
      FROM flags f
      CROSS JOIN msk
    `,
    prisma.$queryRaw<
      Array<{
        week_start: Date;
        cohort_size: bigint;
        w0: bigint;
        w1: bigint;
        w2: bigint;
        w3: bigint;
        w4: bigint;
      }>
    >`
      WITH msk AS (
        SELECT DATE_TRUNC('week', (NOW() AT TIME ZONE 'Europe/Moscow'))::date AS current_week
      ),
      regs AS (
        SELECT
          u."id",
          DATE_TRUNC('week', (u."created_at" AT TIME ZONE 'Europe/Moscow'))::date AS reg_week
        FROM "User" u
        CROSS JOIN msk
        WHERE DATE_TRUNC('week', (u."created_at" AT TIME ZONE 'Europe/Moscow'))::date >= msk.current_week - (5 * INTERVAL '1 week')
          ${uFilter}
      ),
      active_weeks AS (
        SELECT DISTINCT
          ae."userId",
          DATE_TRUNC('week', (ae."created_at" AT TIME ZONE 'Europe/Moscow'))::date AS act_week
        FROM "analytics_events" ae
        CROSS JOIN msk
        WHERE ae."userId" IS NOT NULL
          AND DATE_TRUNC('week', (ae."created_at" AT TIME ZONE 'Europe/Moscow'))::date >= msk.current_week - (5 * INTERVAL '1 week')
      )
      SELECT
        r.reg_week AS week_start,
        COUNT(DISTINCT r."id") AS cohort_size,
        COUNT(DISTINCT r."id") AS w0,
        COUNT(DISTINCT r."id") FILTER (WHERE EXISTS (SELECT 1 FROM active_weeks aw WHERE aw."userId" = r."id" AND aw.act_week = (r.reg_week + INTERVAL '1 week')::date)) AS w1,
        COUNT(DISTINCT r."id") FILTER (WHERE EXISTS (SELECT 1 FROM active_weeks aw WHERE aw."userId" = r."id" AND aw.act_week = (r.reg_week + INTERVAL '2 weeks')::date)) AS w2,
        COUNT(DISTINCT r."id") FILTER (WHERE EXISTS (SELECT 1 FROM active_weeks aw WHERE aw."userId" = r."id" AND aw.act_week = (r.reg_week + INTERVAL '3 weeks')::date)) AS w3,
        COUNT(DISTINCT r."id") FILTER (WHERE EXISTS (SELECT 1 FROM active_weeks aw WHERE aw."userId" = r."id" AND aw.act_week = (r.reg_week + INTERVAL '4 weeks')::date)) AS w4
      FROM regs r
      GROUP BY r.reg_week
      ORDER BY r.reg_week DESC
    `,
  ]);

  const dc = dayCohortRows[0];
  const d1Stat: CohortWindowStat = {
    eligible: Number(dc?.d1_eligible ?? 0),
    retained: Number(dc?.d1_retained ?? 0),
    rate: calcRate(Number(dc?.d1_retained ?? 0), Number(dc?.d1_eligible ?? 0)),
  };
  const d7Stat: CohortWindowStat = {
    eligible: Number(dc?.d7_eligible ?? 0),
    retained: Number(dc?.d7_retained ?? 0),
    rate: calcRate(Number(dc?.d7_retained ?? 0), Number(dc?.d7_eligible ?? 0)),
  };
  const d30Stat: CohortWindowStat = {
    eligible: Number(dc?.d30_eligible ?? 0),
    retained: Number(dc?.d30_retained ?? 0),
    rate: calcRate(Number(dc?.d30_retained ?? 0), Number(dc?.d30_eligible ?? 0)),
  };

  const nowMskMs = Date.now() + 3 * 60 * 60 * 1000;
  const currentWeekStartMs = (() => {
    const d = new Date(nowMskMs);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff);
  })();

  const weeklyMatrix: WeeklyCohortRow[] = weeklyRows.map((w) => {
    const size = Number(w.cohort_size ?? 0);
    const weekDate = new Date(w.week_start);
    const weekStartIso = weekDate.toISOString().slice(0, 10);
    const weeksElapsed = Math.floor(
      (currentWeekStartMs - weekDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    const counts = [Number(w.w0), Number(w.w1), Number(w.w2), Number(w.w3), Number(w.w4)];
    const retentionByWeek = counts.map((cnt, idx) => {
      if (idx > weeksElapsed) return null;
      return calcRate(cnt, size);
    });
    return { weekStart: weekStartIso, cohortSize: size, retentionByWeek };
  });

  return {
    d1: d1Stat.rate,
    d7: d7Stat.rate,
    d30: d30Stat.rate,
    cohorts: { d1: d1Stat, d7: d7Stat, d30: d30Stat },
    weeklyMatrix,
  };
}

export async function queryTimeseries(
  prisma: PrismaClient,
  excludedIds: number[],
  days: number,
): Promise<TimeseriesPoint[]> {
  const safeDays = Math.max(1, Math.min(days, 365));
  const lookbackDays = safeDays - 1;
  const evFilter = excludedEventsFilterSql(excludedIds, "ae");
  const uFilter = excludedUsersFilterSql(excludedIds, "u");
  const tlFilter =
    excludedIds.length > 0
      ? Prisma.sql`AND tl."userId" NOT IN (${Prisma.join(excludedIds)})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{
      day: Date;
      visitors: bigint;
      dau: bigint;
      registrations: bigint;
      tierlists: bigint;
      searches: bigint;
      ai_requests: bigint;
    }>
  >`
    WITH msk AS (
      SELECT (NOW() AT TIME ZONE 'Europe/Moscow')::date AS today_msk
    ),
    days AS (
      SELECT generate_series(msk.today_msk - ${lookbackDays}::int, msk.today_msk, INTERVAL '1 day')::date AS day
      FROM msk
    ),
    ev_daily AS (
      SELECT
        (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date AS day,
        COUNT(DISTINCT COALESCE(ae."anonymous_id", ae."ip")) FILTER (WHERE COALESCE(ae."anonymous_id", ae."ip") IS NOT NULL) AS visitors,
        COUNT(DISTINCT ae."userId") FILTER (WHERE ae."userId" IS NOT NULL) AS dau,
        COUNT(*) FILTER (WHERE ae."event" = 'book_search') AS searches,
        COUNT(*) FILTER (WHERE ae."event" IN ('ai_librarian_message', 'ai_librarian_suggestion', 'ai_avatar')) AS ai_requests
      FROM "analytics_events" ae
      CROSS JOIN msk
      WHERE (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= msk.today_msk - ${lookbackDays}::int
        ${evFilter}
      GROUP BY 1
    ),
    reg_daily AS (
      SELECT
        (u."created_at" AT TIME ZONE 'Europe/Moscow')::date AS day,
        COUNT(*) AS registrations
      FROM "User" u
      CROSS JOIN msk
      WHERE (u."created_at" AT TIME ZONE 'Europe/Moscow')::date >= msk.today_msk - ${lookbackDays}::int
        ${uFilter}
      GROUP BY 1
    ),
    tl_daily AS (
      SELECT
        (tl."created_at" AT TIME ZONE 'Europe/Moscow')::date AS day,
        COUNT(*) AS tierlists
      FROM "tier_lists" tl
      CROSS JOIN msk
      WHERE tl."is_template" = false
        AND (tl."created_at" AT TIME ZONE 'Europe/Moscow')::date >= msk.today_msk - ${lookbackDays}::int
        ${tlFilter}
      GROUP BY 1
    ),
    rollup_daily AS (
      SELECT
        ds."date"::date AS day,
        MAX(CASE WHEN ds."metric_key" = 'visitors' THEN ds."unique_count" ELSE 0 END) AS visitors,
        MAX(CASE WHEN ds."metric_key" = 'dau' THEN ds."unique_count" ELSE 0 END) AS dau,
        MAX(CASE WHEN ds."metric_key" = 'event:book_search' THEN ds."count" ELSE 0 END) AS searches,
        MAX(CASE WHEN ds."metric_key" = 'ai_requests' THEN ds."count" ELSE 0 END) AS ai_requests
      FROM "analytics_daily_stats" ds
      CROSS JOIN msk
      WHERE ds."date" >= msk.today_msk - ${lookbackDays}::int
        AND ds."dimension" = ''
      GROUP BY 1
    )
    SELECT
      d.day,
      GREATEST(COALESCE(ev.visitors, 0), COALESCE(ro.visitors, 0)) AS visitors,
      GREATEST(COALESCE(ev.dau, 0), COALESCE(ro.dau, 0)) AS dau,
      COALESCE(reg.registrations, 0) AS registrations,
      COALESCE(tl.tierlists, 0) AS tierlists,
      GREATEST(COALESCE(ev.searches, 0), COALESCE(ro.searches, 0)) AS searches,
      GREATEST(COALESCE(ev.ai_requests, 0), COALESCE(ro.ai_requests, 0)) AS ai_requests
    FROM days d
    LEFT JOIN ev_daily ev ON ev.day = d.day
    LEFT JOIN reg_daily reg ON reg.day = d.day
    LEFT JOIN tl_daily tl ON tl.day = d.day
    LEFT JOIN rollup_daily ro ON ro.day = d.day
    ORDER BY d.day ASC
  `;

  return rows.map((r) => ({
    date: new Date(r.day).toISOString().slice(0, 10),
    visitors: Number(r.visitors ?? 0),
    dau: Number(r.dau ?? 0),
    registrations: Number(r.registrations ?? 0),
    tierlists: Number(r.tierlists ?? 0),
    searches: Number(r.searches ?? 0),
    aiRequests: Number(r.ai_requests ?? 0),
  }));
}

export async function queryInsights(
  prisma: PrismaClient,
  excludedIds: number[],
  days: number,
): Promise<InsightsResult> {
  const safeDays = Math.max(1, Math.min(days, 365));
  const evFilter = excludedEventsFilterSql(excludedIds, "ae");

  const [
    topPageRows,
    topSearchRows,
    zeroSearchRows,
    deviceRows,
    browserRows,
    sourceRows,
    featureRows,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ url: string; views: bigint; unique_visitors: bigint }>>`
      SELECT
        ae."url",
        COUNT(*) AS views,
        COUNT(DISTINCT COALESCE(ae."anonymous_id", ae."ip")) AS unique_visitors
      FROM "analytics_events" ae
      WHERE ae."event" = 'page_view'
        AND ae."url" IS NOT NULL
        AND ae."created_at" >= NOW() - (${safeDays} * INTERVAL '1 day')
        ${evFilter}
      GROUP BY ae."url"
      ORDER BY views DESC
      LIMIT 15
    `,
    prisma.$queryRaw<Array<{ query: string; count: bigint; avg_results: number | null }>>`
      SELECT
        LOWER(TRIM(ae."meta"->>'query')) AS query,
        COUNT(*) AS count,
        AVG(
          CASE
            WHEN (ae."meta"->>'resultsCount') ~ '^[0-9]+$'
            THEN (ae."meta"->>'resultsCount')::float
            ELSE NULL
          END
        ) AS avg_results
      FROM "analytics_events" ae
      WHERE ae."event" = 'book_search'
        AND NULLIF(TRIM(ae."meta"->>'query'), '') IS NOT NULL
        AND ae."created_at" >= NOW() - (${safeDays} * INTERVAL '1 day')
        ${evFilter}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 15
    `,
    prisma.$queryRaw<Array<{ query: string; count: bigint }>>`
      SELECT
        LOWER(TRIM(ae."meta"->>'query')) AS query,
        COUNT(*) AS count
      FROM "analytics_events" ae
      WHERE ae."event" = 'book_search'
        AND NULLIF(TRIM(ae."meta"->>'query'), '') IS NOT NULL
        AND (ae."meta"->>'resultsCount') = '0'
        AND ae."created_at" >= NOW() - (${safeDays} * INTERVAL '1 day')
        ${evFilter}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 15
    `,
    prisma.$queryRaw<Array<{ device_type: string; count: bigint }>>`
      SELECT
        COALESCE(ae."device_type", 'desktop') AS device_type,
        COUNT(DISTINCT COALESCE(ae."session_id", ae."anonymous_id", ae."ip", ae."id"::text)) AS count
      FROM "analytics_events" ae
      WHERE ae."created_at" >= NOW() - (${safeDays} * INTERVAL '1 day')
        ${evFilter}
      GROUP BY 1
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ browser: string; count: bigint }>>`
      SELECT
        COALESCE(ae."browser", 'Неизвестно') AS browser,
        COUNT(DISTINCT COALESCE(ae."session_id", ae."anonymous_id", ae."ip", ae."id"::text)) AS count
      FROM "analytics_events" ae
      WHERE ae."created_at" >= NOW() - (${safeDays} * INTERVAL '1 day')
        ${evFilter}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `,
    prisma.$queryRaw<Array<{ source: string; visits: bigint; unique_visitors: bigint }>>`
      SELECT
        COALESCE(
          NULLIF(ae."utm_source", ''),
          NULLIF(REGEXP_REPLACE(COALESCE(ae."referrer", ''), '^https?://([^/:]+).*$', '\\1'), ''),
          'Прямой заход'
        ) AS source,
        COUNT(DISTINCT COALESCE(ae."session_id", ae."id"::text)) AS visits,
        COUNT(DISTINCT COALESCE(ae."anonymous_id", ae."ip")) AS unique_visitors
      FROM "analytics_events" ae
      WHERE ae."event" IN ('session_start', 'page_view')
        AND ae."created_at" >= NOW() - (${safeDays} * INTERVAL '1 day')
        ${evFilter}
      GROUP BY 1
      ORDER BY visits DESC
      LIMIT 10
    `,
    prisma.$queryRaw<
      Array<{
        ai_librarian_messages: bigint;
        ai_avatars: bigint;
        dna_started: bigint;
        dna_sealed: bigint;
        dna_duels: bigint;
        dna_shared: bigint;
        exports_png: bigint;
        shares: bigint;
        donate_opens: bigint;
        donate_copies: bigint;
      }>
    >`
      SELECT
        COUNT(*) FILTER (WHERE ae."event" IN ('ai_librarian_message', 'ai_librarian_suggestion')) AS ai_librarian_messages,
        COUNT(*) FILTER (WHERE ae."event" = 'ai_avatar') AS ai_avatars,
        COUNT(*) FILTER (WHERE ae."event" = 'dna_started') AS dna_started,
        COUNT(*) FILTER (WHERE ae."event" = 'dna_sealed') AS dna_sealed,
        COUNT(*) FILTER (WHERE ae."event" = 'dna_duel') AS dna_duels,
        COUNT(*) FILTER (WHERE ae."event" = 'dna_shared') AS dna_shared,
        COUNT(*) FILTER (WHERE ae."event" = 'export_png') AS exports_png,
        COUNT(*) FILTER (WHERE ae."event" = 'share_clicked') AS shares,
        COUNT(*) FILTER (WHERE ae."event" IN ('donate_page_open', 'cta.landing.donate', 'cta.footer.donate')) AS donate_opens,
        COUNT(*) FILTER (WHERE ae."event" IN ('donate_copy', 'donate.footer.copy_card')) AS donate_copies
      FROM "analytics_events" ae
      WHERE ae."created_at" >= NOW() - (${safeDays} * INTERVAL '1 day')
        ${evFilter}
    `,
  ]);

  const f = featureRows[0];

  return {
    days: safeDays,
    topPages: topPageRows.map((r) => ({
      url: r.url,
      views: Number(r.views),
      uniqueVisitors: Number(r.unique_visitors),
    })),
    topSearches: topSearchRows.map((r) => ({
      query: r.query,
      count: Number(r.count),
      avgResults: r.avg_results !== null ? Math.round(r.avg_results * 10) / 10 : null,
    })),
    zeroResultSearches: zeroSearchRows.map((r) => ({
      query: r.query,
      count: Number(r.count),
    })),
    devices: deviceRows.map((r) => ({
      deviceType: r.device_type,
      count: Number(r.count),
    })),
    browsers: browserRows.map((r) => ({
      browser: r.browser,
      count: Number(r.count),
    })),
    sources: sourceRows.map((r) => ({
      source: r.source,
      visits: Number(r.visits),
      uniqueVisitors: Number(r.unique_visitors),
    })),
    features: {
      aiLibrarianMessages: Number(f?.ai_librarian_messages ?? 0),
      aiAvatars: Number(f?.ai_avatars ?? 0),
      dnaStarted: Number(f?.dna_started ?? 0),
      dnaSealed: Number(f?.dna_sealed ?? 0),
      dnaDuels: Number(f?.dna_duels ?? 0),
      dnaShared: Number(f?.dna_shared ?? 0),
      exportsPng: Number(f?.exports_png ?? 0),
      shares: Number(f?.shares ?? 0),
      donateOpens: Number(f?.donate_opens ?? 0),
      donateCopies: Number(f?.donate_copies ?? 0),
    },
  };
}

/**
 * Сворачивает события вчерашнего дня (или дней старше cutoff, перед очисткой)
 * в таблицу analytics_daily_stats. Идемпотентен благодаря ON CONFLICT DO UPDATE.
 */
export async function rollupDailyStatsSql(
  prisma: PrismaClient,
  excludedIds: number[],
  daysBack: number = 2,
): Promise<void> {
  const evFilter = excludedEventsFilterSql(excludedIds, "ae");

  await prisma.$executeRaw`
    INSERT INTO "analytics_daily_stats" ("date", "metric_key", "dimension", "count", "unique_count")
    SELECT
      (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date AS date,
      'visitors' AS metric_key,
      '' AS dimension,
      COUNT(*) AS count,
      COUNT(DISTINCT COALESCE(ae."anonymous_id", ae."ip")) AS unique_count
    FROM "analytics_events" ae
    WHERE (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= ((NOW() AT TIME ZONE 'Europe/Moscow')::date - ${daysBack}::int)
      AND (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date < (NOW() AT TIME ZONE 'Europe/Moscow')::date
      AND COALESCE(ae."anonymous_id", ae."ip") IS NOT NULL
      ${evFilter}
    GROUP BY 1
    ON CONFLICT ("date", "metric_key", "dimension")
    DO UPDATE SET "count" = EXCLUDED."count", "unique_count" = EXCLUDED."unique_count"
  `;

  await prisma.$executeRaw`
    INSERT INTO "analytics_daily_stats" ("date", "metric_key", "dimension", "count", "unique_count")
    SELECT
      (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date AS date,
      'dau' AS metric_key,
      '' AS dimension,
      COUNT(*) AS count,
      COUNT(DISTINCT ae."userId") AS unique_count
    FROM "analytics_events" ae
    WHERE (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= ((NOW() AT TIME ZONE 'Europe/Moscow')::date - ${daysBack}::int)
      AND (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date < (NOW() AT TIME ZONE 'Europe/Moscow')::date
      AND ae."userId" IS NOT NULL
      ${evFilter}
    GROUP BY 1
    ON CONFLICT ("date", "metric_key", "dimension")
    DO UPDATE SET "count" = EXCLUDED."count", "unique_count" = EXCLUDED."unique_count"
  `;

  await prisma.$executeRaw`
    INSERT INTO "analytics_daily_stats" ("date", "metric_key", "dimension", "count", "unique_count")
    SELECT
      (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date AS date,
      'event:' || ae."event" AS metric_key,
      '' AS dimension,
      COUNT(*) AS count,
      COUNT(DISTINCT COALESCE(ae."userId"::text, ae."anonymous_id", ae."ip")) AS unique_count
    FROM "analytics_events" ae
    WHERE (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= ((NOW() AT TIME ZONE 'Europe/Moscow')::date - ${daysBack}::int)
      AND (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date < (NOW() AT TIME ZONE 'Europe/Moscow')::date
      AND ae."event" IN ('book_search', 'tierlist_create', 'export_png', 'share_clicked')
      ${evFilter}
    GROUP BY 1, 2
    ON CONFLICT ("date", "metric_key", "dimension")
    DO UPDATE SET "count" = EXCLUDED."count", "unique_count" = EXCLUDED."unique_count"
  `;

  await prisma.$executeRaw`
    INSERT INTO "analytics_daily_stats" ("date", "metric_key", "dimension", "count", "unique_count")
    SELECT
      (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date AS date,
      'ai_requests' AS metric_key,
      '' AS dimension,
      COUNT(*) AS count,
      COUNT(DISTINCT COALESCE(ae."userId"::text, ae."anonymous_id", ae."ip")) AS unique_count
    FROM "analytics_events" ae
    WHERE (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date >= ((NOW() AT TIME ZONE 'Europe/Moscow')::date - ${daysBack}::int)
      AND (ae."created_at" AT TIME ZONE 'Europe/Moscow')::date < (NOW() AT TIME ZONE 'Europe/Moscow')::date
      AND ae."event" IN ('ai_librarian_message', 'ai_librarian_suggestion', 'ai_avatar')
      ${evFilter}
    GROUP BY 1
    ON CONFLICT ("date", "metric_key", "dimension")
    DO UPDATE SET "count" = EXCLUDED."count", "unique_count" = EXCLUDED."unique_count"
  `;
}
