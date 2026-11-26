import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  Search,
  Filter,
  Users,
  TrendingUp,
  Repeat,
  Activity,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  MessageCircle,
  EyeOff,
  Download,
  UserCheck,
} from "lucide-react";
import {
  apiGetAnalytics,
  apiGetAnalyticsSummary,
  apiGetAnalyticsMetrics,
  apiGetAnalyticsFunnel,
  apiGetAnalyticsRetention,
  apiGetAnalyticsTimeseries,
  apiGetAnalyticsInsights,
  type AnalyticsEvent,
} from "@/lib/analyticsApi";
import { apiGetOnlinePresence } from "@/lib/presenceApi";
import { apiAdminGetOrCreateUserThread } from "@/lib/supportApi";
import { formatEventLabel, getEventBadgeStyle, ALL_EVENT_OPTIONS } from "@/lib/analyticsEvents";
import { sileo } from "sileo";
import { TimeseriesChart } from "./components/TimeseriesChart";
import { FunnelsAndRetentionTab } from "./components/FunnelsAndRetentionTab";
import { InsightsTab } from "./components/InsightsTab";
import { UserJourneyDrawer } from "./components/UserJourneyDrawer";

type AnalyticsTab = "overview" | "insights" | "funnels" | "events";

function getMoscowDateString(offsetDays = 0): string {
  const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowMsk = new Date(Date.now() + MSK_OFFSET_MS - offsetDays * 24 * 60 * 60 * 1000);
  const y = nowMsk.getUTCFullYear();
  const m = String(nowMsk.getUTCMonth() + 1).padStart(2, "0");
  const d = String(nowMsk.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function DeviceIcon({ deviceType }: { deviceType?: string | null }) {
  if (deviceType === "mobile") {
    return <Smartphone size={13} className="text-sky-400 shrink-0" aria-label="Мобильный" />;
  }
  if (deviceType === "tablet") {
    return <Tablet size={13} className="text-violet-400 shrink-0" aria-label="Планшет" />;
  }
  return <Monitor size={13} className="text-gray-400 shrink-0" aria-label="Десктоп" />;
}

function DeltaBadge({ pct, label }: { pct?: number | null; label: string }) {
  if (pct === null || pct === undefined) {
    return <span className="text-xs text-gray-500">{label}</span>;
  }
  const positive = pct >= 0;
  return (
    <span className={`text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
      {positive ? "+" : ""}
      {pct}% {label}
    </span>
  );
}

function renderMetaSummary(event: string, meta?: Record<string, unknown> | null) {
  if (!meta || typeof meta !== "object") return null;
  if (event === "book_search" && typeof meta.query === "string" && meta.query) {
    const count = typeof meta.resultsCount === "number" ? meta.resultsCount : null;
    return (
      <span className="text-[11px] text-amber-400 font-mono inline-flex items-center gap-1.5">
        <span>«{meta.query}»</span>
        {count !== null && (
          <span className={count === 0 ? "text-red-400 font-semibold" : "text-gray-400"}>
            ({count === 0 ? "0 найдено" : `${count} найд.`})
          </span>
        )}
      </span>
    );
  }
  if (event === "book_placed") {
    const book = typeof meta.bookTitle === "string" ? meta.bookTitle : "";
    const tier = typeof meta.tierTitle === "string" ? meta.tierTitle : "";
    if (book || tier) {
      return <span className="text-[11px] text-lime-400">{book} → «{tier}»</span>;
    }
  }
  if (event === "book_unranked" && typeof meta.bookTitle === "string") {
    return <span className="text-[11px] text-yellow-400">{meta.bookTitle}</span>;
  }
  if (event === "tier_rename" && typeof meta.tierTitle === "string") {
    return <span className="text-[11px] text-violet-400">«{meta.tierTitle}»</span>;
  }
  if (event === "tier_create" && typeof meta.tierTitle === "string") {
    return <span className="text-[11px] text-fuchsia-400">«{meta.tierTitle}»</span>;
  }
  if (event === "tierlist_save") {
    const title = typeof meta.title === "string" ? meta.title : "";
    const count = typeof meta.placementsCount === "number" ? ` (${meta.placementsCount} книг)` : "";
    if (title || count) {
      return <span className="text-[11px] text-emerald-400">{title}{count}</span>;
    }
  }
  if ((event === "tierlist_publish" || event === "tierlist_unpublish") && typeof meta.title === "string") {
    return <span className="text-[11px] text-teal-400">{meta.title}</span>;
  }
  if (event === "export_png" && typeof meta.mode === "string") {
    return (
      <span className="text-[11px] text-indigo-300">
        {meta.mode === "share" ? "через системное меню" : "скачивание файла"}
      </span>
    );
  }
  if (event === "share_clicked" && typeof meta.method === "string") {
    return <span className="text-[11px] text-indigo-300">метод: {meta.method}</span>;
  }
  if ((event === "feedback.rating_selected" || event === "feedback.prompt_submitted") && typeof meta.rating === "number") {
    return <span className="text-[11px] text-amber-300">оценка: {meta.rating}/5</span>;
  }
  if (event.startsWith("dna_") && typeof meta.archetype === "string") {
    return <span className="text-[11px] text-fuchsia-300">{meta.archetype}</span>;
  }
  return null;
}

function rateColor(value: number): string {
  if (value >= 40) return "text-emerald-400";
  if (value >= 20) return "text-amber-400";
  return "text-red-400";
}

function escapeCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [hidePageViews, setHidePageViews] = useState(true);
  const [eventFilter, setEventFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();
  const [prevCursors, setPrevCursors] = useState<Array<string | undefined>>([]);
  const [openingChatUserId, setOpeningChatUserId] = useState<number | null>(null);
  const [journeyTarget, setJourneyTarget] = useState<{
    userId?: number;
    anonymousId?: string;
    label?: string;
  } | null>(null);

  const { data: onlineSnapshot } = useQuery({
    queryKey: ["admin-presence-online"],
    queryFn: apiGetOnlinePresence,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const { data: summary } = useQuery({
    queryKey: ["admin-analytics-summary"],
    queryFn: apiGetAnalyticsSummary,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-analytics-metrics"],
    queryFn: apiGetAnalyticsMetrics,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const { data: timeseries } = useQuery({
    queryKey: ["admin-analytics-timeseries", periodDays],
    queryFn: () => apiGetAnalyticsTimeseries(periodDays),
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["admin-analytics-insights", periodDays],
    queryFn: () => apiGetAnalyticsInsights(periodDays),
    enabled: activeTab === "insights",
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const { data: funnel } = useQuery({
    queryKey: ["admin-analytics-funnel", periodDays],
    queryFn: () => apiGetAnalyticsFunnel(periodDays),
    enabled: activeTab === "funnels" || activeTab === "overview",
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const { data: retention } = useQuery({
    queryKey: ["admin-analytics-retention"],
    queryFn: apiGetAnalyticsRetention,
    enabled: activeTab === "funnels" || activeTab === "overview",
    refetchOnWindowFocus: true,
  });

  const excludeEventsParam = hidePageViews && !eventFilter ? "page_view" : undefined;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "admin-analytics",
      eventFilter,
      excludeEventsParam,
      searchQuery,
      dateFrom,
      dateTo,
      currentCursor,
    ],
    queryFn: () =>
      apiGetAnalytics({
        event: eventFilter || undefined,
        excludeEvents: excludeEventsParam,
        search: searchQuery || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        limit: 50,
        cursor: currentCursor,
      }),
    refetchInterval: !currentCursor ? 15_000 : false,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const events = data?.events ?? [];
  const nextCursor = data?.nextCursor ?? null;
  const total = data?.total ?? 0;

  const handlePrevPage = () => {
    if (prevCursors.length === 0) return;
    const prev = prevCursors[prevCursors.length - 1];
    setPrevCursors(prevCursors.slice(0, -1));
    setCurrentCursor(prev);
  };

  const handleNextPage = () => {
    if (nextCursor) {
      setPrevCursors([...prevCursors, currentCursor]);
      setCurrentCursor(nextCursor);
    }
  };

  const resetFilters = () => {
    setEventFilter("");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setCurrentCursor(undefined);
    setPrevCursors([]);
  };

  const applyDatePreset = (preset: "today" | "yesterday" | "7d" | "30d" | "all") => {
    setCurrentCursor(undefined);
    setPrevCursors([]);
    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const today = getMoscowDateString(0);
    if (preset === "today") {
      setDateFrom(today);
      setDateTo(today);
      return;
    }
    if (preset === "yesterday") {
      const yesterday = getMoscowDateString(1);
      setDateFrom(yesterday);
      setDateTo(yesterday);
      return;
    }
    if (preset === "7d") {
      setDateFrom(getMoscowDateString(6));
      setDateTo(today);
      return;
    }
    setDateFrom(getMoscowDateString(29));
    setDateTo(today);
  };

  const handleRefreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-presence-online"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-analytics-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-analytics-metrics"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-analytics-timeseries"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-analytics-insights"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-analytics-funnel"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-analytics-retention"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
  };

  const handleOpenChat = async (userId: number) => {
    try {
      setOpeningChatUserId(userId);
      const { threadId } = await apiAdminGetOrCreateUserThread(userId);
      navigate(`/admin/support?thread=${threadId}`);
    } catch {
      sileo.error({ title: "Ошибка", description: "Не удалось открыть чат с пользователем" });
    } finally {
      setOpeningChatUserId(null);
    }
  };

  const handleExportCsv = () => {
    const header = ["ID", "Событие", "Пользователь", "Гость", "Устройство", "Браузер", "UTM", "URL", "Время", "Meta"];
    const rows = events.map((ev) => [
      ev.id,
      formatEventLabel(ev.event),
      ev.username || "",
      ev.anonymousId || "",
      ev.deviceType || "",
      ev.browser || "",
      ev.utmSource || "",
      ev.url || "",
      ev.createdAt,
      ev.meta ? JSON.stringify(ev.meta) : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookstrata-analytics-${getMoscowDateString(0)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f6f1e8]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Назад к панели</span>
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
                <BarChart3 className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Аналитика</h1>
                <p className="text-sm text-gray-400">Живой онлайн, метрики роста, воронки, поиск и путь пользователя</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-gray-800 bg-[#141414] p-0.5 text-xs">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPeriodDays(d)}
                    className={`rounded-md px-2.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      periodDays === d ? "bg-violet-500/25 text-violet-200" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {d}д
                  </button>
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">
                <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Автообновление</span>
              </span>
              <button
                type="button"
                onClick={handleRefreshAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:border-gray-600 transition-colors cursor-pointer"
              >
                <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
                <span>Обновить</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (без перезагрузки страницы) */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-800 pb-3">
          {(
            [
              { id: "overview", label: "Обзор и Live" },
              { id: "insights", label: "Контент, Поиск и Трафик" },
              { id: "funnels", label: "Воронки и Когорты" },
              { id: "events", label: "Лента событий" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-violet-500/20 text-violet-200 border border-violet-500/40"
                  : "bg-[#151515] text-gray-400 border border-transparent hover:text-white hover:bg-[#1d1d1d]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            {/* ——— Сейчас на сайте (Live Presence) ——— */}
            {onlineSnapshot && (
              <div className="mb-6 rounded-xl border border-emerald-500/30 bg-[#121614] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                      Сейчас на сайте
                    </h2>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                      {onlineSnapshot.totalOnline}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span>Авторизованных: <strong className="text-[#f6f1e8]">{onlineSnapshot.authCount}</strong></span>
                    <span>Гостей: <strong className="text-[#f6f1e8]">{onlineSnapshot.guestCount}</strong></span>
                    <span>Активны: <strong className="text-emerald-400">{onlineSnapshot.activeCount}</strong></span>
                    <span>Отошли: <strong className="text-amber-400">{onlineSnapshot.idleCount}</strong></span>
                  </div>
                </div>

                {onlineSnapshot.users.length === 0 && onlineSnapshot.guestsByPage.length === 0 ? (
                  <p className="text-xs text-gray-500">В данный момент активных посетителей нет</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-lg border border-gray-800 bg-[#111] p-3">
                      <p className="text-xs font-semibold text-gray-400 mb-2">
                        Авторизованные пользователи ({onlineSnapshot.users.length})
                      </p>
                      {onlineSnapshot.users.length === 0 ? (
                        <p className="text-xs text-gray-600 py-2">Сейчас нет авторизованных пользователей в сети</p>
                      ) : (
                        <div className="divide-y divide-gray-800/80 max-h-64 overflow-y-auto">
                          {onlineSnapshot.users.map((u) => (
                            <div key={u.userId} className="flex items-center justify-between gap-3 py-2 text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`inline-block size-2 rounded-full shrink-0 ${
                                    u.status === "active" ? "bg-emerald-400" : "bg-amber-400"
                                  }`}
                                  title={u.status === "active" ? "Активен" : "Отошёл (>90с без действий)"}
                                />
                                <DeviceIcon deviceType={u.deviceType} />
                                <button
                                  type="button"
                                  onClick={() => setJourneyTarget({ userId: u.userId, label: u.username })}
                                  className="font-medium text-[#f6f1e8] hover:text-amber-400 truncate cursor-pointer text-left"
                                  title="Открыть таймлайн пользователя"
                                >
                                  {u.username}
                                </button>
                                {u.isExcluded && (
                                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400 shrink-0">
                                    скрыт из метрик
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-gray-400 truncate max-w-44" title={u.page}>
                                  {u.page}
                                </span>
                                <span className="text-gray-500 tabular-nums">{u.sessionMinutes} мин</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenChat(u.userId)}
                                  disabled={openingChatUserId === u.userId}
                                  className="rounded border border-amber-400/30 bg-amber-400/10 p-1 text-amber-300 hover:bg-amber-400/20 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Написать в чат"
                                >
                                  <MessageCircle size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-gray-800 bg-[#111] p-3">
                      <p className="text-xs font-semibold text-gray-400 mb-2">
                        Гости по страницам ({onlineSnapshot.guestCount})
                      </p>
                      {onlineSnapshot.guestsByPage.length === 0 ? (
                        <p className="text-xs text-gray-600 py-2">Гостей сейчас нет</p>
                      ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {onlineSnapshot.guestsByPage.map((g) => (
                            <div key={g.page} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-gray-300 truncate" title={g.page}>
                                {g.page}
                              </span>
                              <span className="rounded bg-white/5 px-2 py-0.5 text-gray-300 font-medium tabular-nums shrink-0">
                                {g.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ——— Метрики (DAU, WAU, MAU, Stickiness, Churn) ——— */}
            {metrics && (
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-gray-400">DAU</p>
                    <Users size={16} className="text-violet-400" />
                  </div>
                  <p className="text-3xl font-bold text-violet-400">{metrics.dau}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <DeltaBadge pct={metrics.deltas?.dauPctChange} label="ко вчера" />
                    <span className="text-[11px] text-gray-500">вчера: {metrics.deltas?.dauYesterday ?? "—"}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-violet-500/20 flex items-center justify-between text-xs text-violet-300/80">
                    <span>Посетителей сегодня:</span>
                    <span className="font-semibold">{metrics.uniqueVisitorsToday}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-gray-400">MAU / WAU</p>
                    <Activity size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-400">
                    {metrics.mau}
                    {metrics.wau !== undefined && (
                      <span className="text-base font-medium text-emerald-300/70 ml-2">/ {metrics.wau}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">авторизованных за 30д / 7д</p>
                  {metrics.deltas && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300/80">
                      <span>Регистраций сегодня:</span>
                      <span className="font-semibold">+{metrics.deltas.newUsersToday}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-gray-400">Stickiness</p>
                    <Repeat size={16} className="text-amber-400" />
                  </div>
                  <p className={`text-3xl font-bold ${rateColor(metrics.stickiness)}`}>
                    {metrics.stickiness}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">DAU/MAU — «липкость» продукта</p>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-gray-400">Churn</p>
                    <TrendingUp size={16} className="text-red-400" />
                  </div>
                  <p className={`text-3xl font-bold ${rateColor(100 - metrics.churnRate)}`}>
                    {metrics.churnRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">отток за месяц ({metrics.churn} чел.)</p>
                </div>
              </div>
            )}

            {/* ——— График динамики по дням ——— */}
            {timeseries && (
              <div className="mb-6">
                <TimeseriesChart points={timeseries.points} />
              </div>
            )}

            {/* ——— Сводка (сегодня / неделя) ——— */}
            {summary && (
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Сегодня</p>
                  <p className="text-3xl font-bold text-violet-400">{summary.todayTotal}</p>
                  <p className="text-xs text-gray-500 mt-1">событий</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">За неделю</p>
                  <p className="text-3xl font-bold text-emerald-400">{summary.weekTotal}</p>
                  <p className="text-xs text-gray-500 mt-1">событий</p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 col-span-1 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Топ событий сегодня</p>
                  <div className="flex flex-wrap gap-2">
                    {summary.todayByEvent.slice(0, 6).map(({ event, count }) => (
                      <button
                        key={event}
                        type="button"
                        onClick={() => {
                          setEventFilter(event);
                          setCurrentCursor(undefined);
                          setPrevCursors([]);
                          setActiveTab("events");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-[#1a1a1a] px-2.5 py-1 text-xs hover:border-violet-500/50 transition-colors cursor-pointer"
                        title="Открыть эти события в ленте"
                      >
                        <span className="font-medium text-[#f6f1e8]">{formatEventLabel(event)}</span>
                        <span className="text-gray-400">{count}</span>
                      </button>
                    ))}
                    {summary.todayByEvent.length === 0 && (
                      <span className="text-xs text-gray-500">Нет событий</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "insights" && (
          <InsightsTab insights={insights} isLoading={insightsLoading} />
        )}

        {activeTab === "funnels" && (
          <FunnelsAndRetentionTab funnel={funnel} retention={retention} />
        )}

        {/* ——— Таблица событий (только на вкладке «Лента событий») ——— */}
        {activeTab === "events" && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Лог событий</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "today", label: "Сегодня" },
                    { id: "yesterday", label: "Вчера" },
                    { id: "7d", label: "7 дней" },
                    { id: "30d", label: "30 дней" },
                    { id: "all", label: "Всё время" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyDatePreset(p.id)}
                    className="rounded-md border border-gray-800 bg-[#181818] px-2.5 py-1 text-xs text-gray-300 hover:border-violet-500/50 hover:text-white transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={events.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-[#181818] px-2.5 py-1 text-xs text-gray-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <Download size={12} />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-50 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentCursor(undefined);
                    setPrevCursors([]);
                  }}
                  placeholder="Пользователь, событие или URL..."
                  className="w-full rounded-lg border border-gray-700 bg-[#1a1a1a] py-2 pl-10 pr-4 text-sm text-[#f6f1e8] placeholder:text-gray-500 outline-none focus:border-violet-500"
                />
              </div>

              <select
                value={eventFilter}
                onChange={(e) => {
                  setEventFilter(e.target.value);
                  setCurrentCursor(undefined);
                  setPrevCursors([]);
                }}
                className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-violet-500"
              >
                <option value="">Все события</option>
                {ALL_EVENT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentCursor(undefined);
                  setPrevCursors([]);
                }}
                className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-violet-500"
              />
              <span className="text-gray-500 text-sm">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentCursor(undefined);
                  setPrevCursors([]);
                }}
                className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-violet-500"
              />

              <button
                type="button"
                onClick={() => {
                  setHidePageViews((prev) => !prev);
                  setCurrentCursor(undefined);
                  setPrevCursors([]);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  hidePageViews
                    ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                    : "border-gray-700 bg-[#1a1a1a] text-gray-400 hover:text-white"
                }`}
              >
                <EyeOff size={14} />
                <span>Скрывать page_view</span>
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <Filter className="h-4 w-4" />
                Сбросить
              </button>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-800 bg-[#121212] overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Событий не найдено</p>
                  <p className="text-sm">Попробуйте изменить фильтры</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 bg-[#1a1a1a]">
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Событие</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Пользователь</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Контекст</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">URL</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Время</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {events.map((event: AnalyticsEvent) => (
                        <tr key={event.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium border ${getEventBadgeStyle(event.event)}`}
                              >
                                {formatEventLabel(event.event)}
                              </span>
                              {renderMetaSummary(event.event, event.meta)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {event.username && event.userId ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setJourneyTarget({
                                    userId: event.userId!,
                                    anonymousId: event.anonymousId ?? undefined,
                                    label: event.username!,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 font-medium hover:text-amber-400 transition-colors cursor-pointer"
                                title="Открыть путь пользователя"
                              >
                                <UserCheck size={13} className="text-emerald-400 shrink-0" />
                                <span>{event.username}</span>
                              </button>
                            ) : event.anonymousId ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setJourneyTarget({
                                    anonymousId: event.anonymousId!,
                                  })
                                }
                                className="text-xs text-gray-400 font-mono hover:text-sky-400 cursor-pointer"
                                title="Открыть путь гостя"
                              >
                                гость #{event.anonymousId.slice(0, 6)}
                              </button>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            <div className="flex items-center gap-2">
                              <DeviceIcon deviceType={event.deviceType} />
                              <span>{event.browser || "—"}</span>
                              {event.utmSource && (
                                <span className="rounded bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.5 text-[10px] text-violet-300">
                                  {event.utmSource}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400 max-w-60 truncate" title={event.url || undefined}>
                            {event.url && event.url !== "/api/analytics/track" ? (
                              event.url.startsWith("/") ? (
                                <a
                                  href={event.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-amber-400 hover:underline transition-colors"
                                >
                                  {event.url}
                                </a>
                              ) : (
                                event.url
                              )
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                            {new Date(event.createdAt).toLocaleString("ru-RU")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {events.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={prevCursors.length === 0}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-700 bg-[#1a1a1a] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  ← Назад
                </button>
                <span className="text-sm text-gray-500">{total} записей</span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={!nextCursor}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-700 bg-[#1a1a1a] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Вперед →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <UserJourneyDrawer
        target={journeyTarget}
        onClose={() => setJourneyTarget(null)}
        onOpenChat={handleOpenChat}
      />
    </div>
  );
}
