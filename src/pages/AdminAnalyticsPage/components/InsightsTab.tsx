import type { InsightsResult } from "@/lib/analyticsApi";

interface InsightsTabProps {
  insights?: InsightsResult;
  isLoading: boolean;
}

export function InsightsTab({ insights, isLoading }: InsightsTabProps) {
  if (isLoading && !insights) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!insights) {
    return <p className="text-sm text-gray-500">Нет данных</p>;
  }

  const featureItems = [
    { label: "ИИ-библиотекарь (сообщения)", value: insights.features.aiLibrarianMessages },
    { label: "ИИ-генерация аватаров", value: insights.features.aiAvatars },
    { label: "Книжное ДНК: старт", value: insights.features.dnaStarted },
    { label: "Книжное ДНК: запечатано", value: insights.features.dnaSealed },
    { label: "Книжное ДНК: дуэли", value: insights.features.dnaDuels },
    { label: "Книжное ДНК: шейры", value: insights.features.dnaShared },
    { label: "Экспорт в PNG", value: insights.features.exportsPng },
    { label: "Кнопка «Поделиться»", value: insights.features.shares },
    { label: "Открытия доната", value: insights.features.donateOpens },
    { label: "Копирования реквизитов", value: insights.features.donateCopies },
  ];

  return (
    <div className="space-y-6">
      {/* Фичи */}
      <div className="rounded-xl border border-gray-800 bg-[#121212] p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">
          Использование ключевых фич ({insights.days} дн.)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {featureItems.map((item) => (
            <div key={item.label} className="rounded-lg border border-gray-800 bg-[#171717] p-3">
              <p className="text-xs text-gray-400 leading-snug">{item.label}</p>
              <p className="text-2xl font-bold text-[#f6f1e8] mt-1 tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Популярные страницы */}
        <div className="rounded-xl border border-gray-800 bg-[#121212] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-3">
            Топ страниц
          </h2>
          {insights.topPages.length === 0 ? (
            <p className="text-xs text-gray-500">Пока нет просмотров</p>
          ) : (
            <div className="divide-y divide-gray-800/80">
              {insights.topPages.map((p) => (
                <div key={p.url} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <span className="text-gray-300 truncate" title={p.url}>
                    {p.url}
                  </span>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span className="text-gray-500">{p.uniqueVisitors} уник.</span>
                    <span className="font-bold text-[#f6f1e8]">{p.views}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Источники трафика + Устройства */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-[#121212] p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-3">
              Источники переходов (UTM / Referrer)
            </h2>
            {insights.sources.length === 0 ? (
              <p className="text-xs text-gray-500">Нет данных об источниках</p>
            ) : (
              <div className="divide-y divide-gray-800/80">
                {insights.sources.map((s) => (
                  <div key={s.source} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <span className="text-gray-300 truncate">{s.source}</span>
                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      <span className="text-gray-500">{s.uniqueVisitors} уник.</span>
                      <span className="font-bold text-emerald-400">{s.visits}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-800 bg-[#121212] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Устройства (сессии)
              </h3>
              <div className="space-y-1.5 text-xs">
                {insights.devices.map((d) => (
                  <div key={d.deviceType} className="flex justify-between">
                    <span className="text-gray-300">{d.deviceType}</span>
                    <span className="font-semibold text-[#f6f1e8] tabular-nums">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-[#121212] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Браузеры
              </h3>
              <div className="space-y-1.5 text-xs">
                {insights.browsers.map((b) => (
                  <div key={b.browser} className="flex justify-between">
                    <span className="text-gray-300">{b.browser}</span>
                    <span className="font-semibold text-[#f6f1e8] tabular-nums">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Поиски: популярные и пустые */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-[#121212] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-3">
            Топ поисковых запросов
          </h2>
          {insights.topSearches.length === 0 ? (
            <p className="text-xs text-gray-500">Запросов пока нет</p>
          ) : (
            <div className="divide-y divide-gray-800/80">
              {insights.topSearches.map((q) => (
                <div key={q.query} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <span className="text-amber-300 font-mono truncate">«{q.query}»</span>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    {q.avgResults !== null && (
                      <span className="text-gray-500">ср. {q.avgResults} рез.</span>
                    )}
                    <span className="font-bold text-[#f6f1e8]">{q.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-red-500/30 bg-[#161212] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-300 mb-1">
            Пустые поиски (ничего не найдено)
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Книги, которые люди ищут, но их нет в выдаче
          </p>
          {insights.zeroResultSearches.length === 0 ? (
            <p className="text-xs text-gray-500">Пустых запросов не зафиксировано</p>
          ) : (
            <div className="divide-y divide-gray-800/80">
              {insights.zeroResultSearches.map((q) => (
                <div key={q.query} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <span className="text-red-300 font-mono truncate">«{q.query}»</span>
                  <span className="font-bold text-red-400 tabular-nums">{q.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
