import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart3, Search, Filter } from 'lucide-react'
import { apiGetAnalytics, apiGetAnalyticsSummary, type AnalyticsEvent } from '@/lib/analyticsApi'

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Просмотр страницы',
  signup: 'Регистрация',
  login: 'Вход в систему',
  logout: 'Выход',
  session_heartbeat: 'Активность на сайте',
  tierlist_create: 'Создание тир-листа',
  tierlist_fork: 'Форк тир-листа',
  tierlist_like: 'Лайк тир-листа',
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
              <p className="text-sm text-gray-400">
                События пользователей · Всего записей: {total}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
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

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
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
  )
}
