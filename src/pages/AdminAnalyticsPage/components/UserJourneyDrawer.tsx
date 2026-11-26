import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Crown, MessageCircle, ExternalLink } from "lucide-react";
import { apiGetUserJourney } from "@/lib/analyticsApi";
import { formatEventLabel, getEventBadgeStyle } from "@/lib/analyticsEvents";
import { formatRelativeTime, formatTotalMinutes } from "@/utils/timeFormat";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface UserJourneyDrawerProps {
  target: { userId?: number; anonymousId?: string; label?: string } | null;
  onClose: () => void;
  onOpenChat: (userId: number) => void;
}

export function UserJourneyDrawer({ target, onClose, onOpenChat }: UserJourneyDrawerProps) {
  useBodyScrollLock(Boolean(target));

  useEffect(() => {
    if (!target) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [target, onClose]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-journey", target?.userId, target?.anonymousId],
    queryFn: () =>
      apiGetUserJourney({
        userId: target?.userId,
        anonymousId: target?.anonymousId,
      }),
    enabled: Boolean(target && (target.userId || target.anonymousId)),
  });

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <aside
        className="h-full w-full max-w-lg overflow-y-auto border-l border-gray-800 bg-[#101014] p-6 text-[#f6f1e8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label="Путь пользователя"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 pb-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Путь пользователя</p>
            <h2 className="text-xl font-bold mt-0.5">
              {data?.user?.username || target.label || (target.anonymousId ? `Гость #${target.anonymousId.slice(0, 8)}` : "Пользователь")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть панель"
            className="rounded-lg border border-gray-700 bg-[#1a1a1a] p-2 text-gray-400 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-5">
            {data?.user && (
              <div className="rounded-xl border border-gray-800 bg-[#16161b] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium">
                      {data.user.role}
                    </span>
                    {data.user.isPro && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs text-amber-300">
                        <Crown size={11} />
                        Pro
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/users/${data.user.userId}`}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-300 hover:text-white"
                    >
                      <ExternalLink size={12} />
                      Профиль
                    </Link>
                    <button
                      type="button"
                      onClick={() => onOpenChat(data.user!.userId)}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-400/20 cursor-pointer"
                    >
                      <MessageCircle size={12} />
                      Чат
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-800">
                  <div>
                    <p className="text-gray-500">На сайте</p>
                    <p className="font-semibold mt-0.5">{formatTotalMinutes(data.user.totalActiveMinutes)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Последний визит</p>
                    <p className="font-semibold mt-0.5">{formatRelativeTime(data.user.lastActivityAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Тир-листов / комментов</p>
                    <p className="font-semibold mt-0.5">
                      {data.user.tierListsCount} / {data.user.commentsCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Регистрация</p>
                    <p className="font-semibold mt-0.5">
                      {new Date(data.user.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(data?.firstSource || (data?.devices && data.devices.length > 0)) && (
              <div className="rounded-xl border border-gray-800 bg-[#16161b] p-4 text-xs space-y-2">
                {data.firstSource && (
                  <div>
                    <span className="text-gray-500">Первый источник: </span>
                    <span className="text-emerald-300">
                      {data.firstSource.utmSource || data.firstSource.referrer || "прямой"}
                    </span>
                    {data.firstSource.utmCampaign && (
                      <span className="text-gray-400"> ({data.firstSource.utmCampaign})</span>
                    )}
                  </div>
                )}
                {data.devices.length > 0 && (
                  <div>
                    <span className="text-gray-500">Устройства: </span>
                    <span className="text-gray-300">{data.devices.join(", ")}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Хронология ({data?.events.length ?? 0} последних событий)
              </h3>
              {!data?.events.length ? (
                <p className="text-xs text-gray-500">События не найдены</p>
              ) : (
                <div className="space-y-2">
                  {data.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-gray-800/80 bg-[#151519] px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${getEventBadgeStyle(ev.event)}`}>
                          {formatEventLabel(ev.event)}
                        </span>
                        <span className="text-gray-500 whitespace-nowrap">
                          {new Date(ev.createdAt).toLocaleString("ru-RU")}
                        </span>
                      </div>
                      {ev.url && (
                        <p className="text-gray-400 truncate mt-1">{ev.url}</p>
                      )}
                      {ev.meta && Object.keys(ev.meta).length > 0 && (
                        <p className="text-[11px] text-gray-500 font-mono truncate mt-0.5">
                          {JSON.stringify(ev.meta)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
