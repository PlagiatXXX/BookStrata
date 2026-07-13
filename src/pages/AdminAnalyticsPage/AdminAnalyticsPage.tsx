import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart3, Search, Filter, Users, TrendingUp, Repeat, Activity } from 'lucide-react'
import { apiGetAnalytics, apiGetAnalyticsSummary, apiGetAnalyticsMetrics, apiGetAnalyticsFunnel, apiGetAnalyticsRetention, type AnalyticsEvent } from '@/lib/analyticsApi'

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Просмотр страницы',
  signup: 'Регистрация',
  login: 'Вход в систему',
  logout: 'Выход',
  session_heartbeat: 'Активность на сайте',
  tierlist_create: 'Создание тир-листа',
  tierlist_fork: 'Форк тир-листа',
  tierlist_like: 'Лайк тир-листа',
  tierlist_publish: 'Публикация тир-листа',
  tierlist_unpublish: 'Скрытие тир-листа',
  book_add: 'Добавление книг',
  book_search: 'Поиск книг',
  ai_librarian_message: 'Сообщение Букстражу',
  ai_avatar: 'Генерация аватара',
  donate_page_open: 'Открытие страницы поддержки',
  donate_copy: 'Копирование реквизитов',
  review_write: 'Написание ревью',
  battle_participate: 'Участие в битве',
  battle_win: 'Победа в битве',
  export_png: 'Экспорт в PNG',
  share_clicked: 'Поделились',
}

const EVENT_COLORS: Record<string, string> = {
  page_view: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  signup: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  login: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  session_heartbeat: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  tierlist_create: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  tierlist_fork: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  tierlist_like: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  book_add: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  book_search: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  ai_librarian_message: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  donate_page_open: 'bg-green-500/10 text-green-400 border-green-500/30',
}

function getEventStyle(event: string): string {
  return EVENT_COLORS[event] || 'bg-white/5 text-gray-300 border-gray-700'
}

/** Плавный градиент от зелёного к красному в зависимости от значения (0–100%) */
function rateColor(value: number): string {
  if (value >= 40) return 'text-emerald-400'
  if (value >= 20) return 'text-amber-400'
  return 'text-red-400'
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate()
  const [eventFilter, setEventFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentCursor, setCurrentCursor] = useState<string | undefined>()
  const [prevCursors, setPrevCursors] = useState<string[]>([])

  const { data: summary } = useQuery({
    queryKey: ['admin-analytics-summary'],
    queryFn: apiGetAnalyticsSummary,
  })

  const { data: metrics } = useQuery({
    queryKey: ['admin-analytics-metrics'],
    queryFn: apiGetAnalyticsMetrics,
    refetchInterval: 60_000, // обновление раз в минуту
  })

  const { data: funnel } = useQuery({
    queryKey: ['admin-analytics-funnel'],
    queryFn: apiGetAnalyticsFunnel,
  })

  const { data: retention } = useQuery({
    queryKey: ['admin-analytics-retention'],
    queryFn: apiGetAnalyticsRetention,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics', eventFilter, searchQuery, dateFrom, dateTo, currentCursor],
    queryFn: () =>
      apiGetAnalytics({
        event: eventFilter || undefined,
        search: searchQuery || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        limit: 50,
        cursor: currentCursor,
      }),
  })

  const events = data?.events ?? []
  const nextCursor = data?.nextCursor ?? null
  const total = data?.total ?? 0

  const handlePrevPage = useCallback(() => {
    const prev = prevCursors.pop()
    setPrevCursors([...prevCursors])
    setCurrentCursor(prev)
  }, [prevCursors])

  const handleNextPage = useCallback(() => {
    if (nextCursor) {
      setPrevCursors([...prevCursors, currentCursor ?? ''])
      setCurrentCursor(nextCursor)
    }
  }, [nextCursor, prevCursors, currentCursor])

  const resetFilters = useCallback(() => {
    setEventFilter('')
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    setCurrentCursor(undefined)
    setPrevCursors([])
  }, [])

  const maxFunnelCount = funnel?.stages?.length
    ? Math.max(...funnel.stages.map((s) => s.count), 1)
    : 1

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f6f1e8]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Назад к панели</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
              <BarChart3 className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Аналитика</h1>
              <p className="text-sm text-gray-400">Метрики роста, воронка и удержание</p>
            </div>
          </div>
        </div>

        {/* ——— Метрики (DAU, MAU, Stickiness, Churn) ——— */}
        {metrics && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-gray-400">DAU</p>
                <Users size={16} className="text-violet-400" />
              </div>
              <p className="text-3xl font-bold text-violet-400">{metrics.dau}</p>
              <p className="text-xs text-gray-500 mt-1">уникальных пользователей сегодня</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-gray-400">MAU</p>
                <Activity size={16} className="text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-emerald-400">{metrics.mau}</p>
              <p className="text-xs text-gray-500 mt-1">за последние 30 дней</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-gray-400">Stickiness</p>
                <Repeat size={16} className="text-amber-400" />
              </div>
              <p className={`text-3xl font-bold ${rateColor(metrics.stickiness)}`}>
                {metrics.stickiness}%
              </p>
              <p className="text-xs text-gray-500 mt-1">DAU/MAU — «липкость» продукта</p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-center justify-between mb-3">
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

        {/* ——— Воронка + Retention ——— */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Воронка */}
          {funnel && (
            <div className="rounded-xl border border-gray-800 bg-[#121212] p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Воронка</h2>
              <div className="flex flex-col gap-3">
                {funnel.stages.map((stage, i) => {
                  const pct = Math.round((stage.count / maxFunnelCount) * 100)
                  const conversion = i > 0 && funnel.stages[i - 1].count > 0
                    ? Math.round((stage.count / funnel.stages[i - 1].count) * 100)
                    : null
                  return (
                    <div key={stage.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-gray-300">{stage.name}</span>
                        <span className="text-sm font-bold text-[#f6f1e8]">{stage.count}</span>
                      </div>
                      <div className="relative h-5 w-full bg-gray-800 rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor: i === 0 ? '#6366f1' : i === 1 ? '#8b5cf6' : i === 2 ? '#a855f7' : '#c084fc',
                          }}
                        />
                      </div>
                      {conversion !== null && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Конверсия: {conversion}%
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Retention */}
          {retention && (
            <div className="rounded-xl border border-gray-800 bg-[#121212] p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Retention</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">D1</p>
                  <p className={`text-4xl font-black ${rateColor(retention.d1)}`}>
                    {retention.d1}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">вернулись на следующий день</p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">D7</p>
                  <p className={`text-4xl font-black ${rateColor(retention.d7)}`}>
                    {retention.d7}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">вернулись через неделю</p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">D30</p>
                  <p className={`text-4xl font-black ${rateColor(retention.d30)}`}>
                    {retention.d30}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">вернулись через месяц</p>
                </div>
              </div>
            </div>
          )}
        </div>

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
                  <span key={event} className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-[#1a1a1a] px-2.5 py-1 text-xs">
                    <span className="font-medium text-[#f6f1e8]">{EVENT_LABELS[event] || event}</span>
                    <span className="text-gray-400">{count}</span>
                  </span>
                ))}
                {summary.todayByEvent.length === 0 && (
                  <span className="text-xs text-gray-500">Нет событий</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ——— Таблица событий ——— */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Лог событий</h2>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentCursor(undefined); setPrevCursors([]) }}
                placeholder="Поиск по пользователю..."
                className="w-full rounded-lg border border-gray-700 bg-[#1a1a1a] py-2 pl-10 pr-4 text-sm text-[#f6f1e8] placeholder:text-gray-500 outline-none focus:border-violet-500"
              />
            </div>

            <select
              value={eventFilter}
              onChange={(e) => { setEventFilter(e.target.value); setCurrentCursor(undefined); setPrevCursors([]) }}
              className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-violet-500"
            >
              <option value="">Все события</option>
              {Object.entries(EVENT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentCursor(undefined); setPrevCursors([]) }}
              className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-violet-500"
            />
            <span className="text-gray-500 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentCursor(undefined); setPrevCursors([]) }}
              className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-violet-500"
            />

            <button
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
                      <th className="px-4 py-3 text-left font-medium text-gray-400">URL</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">Время</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {events.map((event: AnalyticsEvent) => (
                      <tr key={event.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium border ${getEventStyle(event.event)}`}>
                            {EVENT_LABELS[event.event] || event.event}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {event.username ? (
                            <span className="font-medium">@{event.username}</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                          {event.url || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {new Date(event.createdAt).toLocaleString('ru-RU')}
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
                onClick={handlePrevPage}
                disabled={prevCursors.length === 0}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 bg-[#1a1a1a] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Назад
              </button>
              <span className="text-sm text-gray-500">
                {total} записей
              </span>
              <button
                onClick={handleNextPage}
                disabled={!nextCursor}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 bg-[#1a1a1a] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Вперед →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
