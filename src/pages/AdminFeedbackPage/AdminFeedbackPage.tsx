import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bug,
  MessageCircle,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Loader,
  Crown,
} from "lucide-react";
import { EditorConfirmModal } from "@/components/EditorModals/EditorConfirmModal";
import { apiClient } from "@/lib/api-client";
import { useFeedback, type FeedbackItem } from "@/hooks/useFeedback";

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; color: string }
> = {
  pending: { label: "Новый", icon: Clock, color: "text-yellow-400" },
  in_progress: { label: "В работе", icon: Loader, color: "text-blue-400" },
  done: { label: "Выполнено", icon: CheckCircle, color: "text-emerald-400" },
  irrelevant: { label: "Неактуально", icon: XCircle, color: "text-gray-500" },
};

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Bug; color: string }
> = {
  bug: { label: "Баг", icon: Bug, color: "text-red-400" },
  feature: { label: "Предложение", icon: MessageCircle, color: "text-violet-400" },
  other: { label: "Другое", icon: MessageCircle, color: "text-gray-400" },
};

const REWARD_OPTIONS = [
  { days: 3, label: "3 дня" },
  { days: 5, label: "5 дней" },
  { days: 7, label: "7 дней" },
];

export default function AdminFeedbackPage() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rewardingId, setRewardingId] = useState<number | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [rewarding, setRewarding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeedback();

  const feedback: FeedbackItem[] = data?.pages.flat() ?? [];

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await apiClient.patch(`/feedback/${id}`, { status });
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/feedback/${id}`);
      setDeleteConfirmId(null);
    } catch {
      // ignore
    }
  };

  const handleReward = async (userId: number, durationDays: number) => {
    setRewarding(true);
    try {
      await apiClient.post("/subscriptions/activate", { userId, durationDays });
      setRewardingId(null);
      setRewardError(null);
    } catch (err) {
      setRewardError(err instanceof Error ? err.message : "Ошибка при активации");
    } finally {
      setRewarding(false);
    }
  };

  const getAuthorLabel = (item: FeedbackItem) => {
    if (item.user?.username) return item.user.username;
    if (item.userEmail) return item.userEmail;
    return "Аноним";
  };

  const authorId = (item: FeedbackItem) => item.user?.id ?? item.userId;

  const loadMoreRef = (node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-6 sm:py-10">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>Назад в админку</span>
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 sm:text-3xl">
            Обратная связь
          </h1>
          <p className="text-gray-400">
            Сообщения от пользователей ({feedback.length})
          </p>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-gray-400">Загрузка…</div>
        )}

        {(isError || rewardError) && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
            {error instanceof Error ? error.message : "Ошибка загрузки"}
            {rewardError}
          </div>
        )}

        {!isLoading && !isError && feedback.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Пока нет сообщений
          </div>
        )}

        {!isLoading && feedback.length > 0 && (
          <div className="space-y-3">
            {feedback.map((item) => {
              const typeCfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.other;
              const TypeIcon = typeCfg.icon;
              const uid = authorId(item);

              return (
                <div
                  key={item.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${typeCfg.color}`}
                        >
                          <TypeIcon size={14} />
                          {typeCfg.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{item.id}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleString("ru-RU")}
                        </span>
                      </div>

                      <p
                        className="text-sm text-white whitespace-pre-wrap break-words select-text"
                      >
                        {expandedId === item.id
                          ? item.message
                          : item.message.length > 120
                            ? item.message.slice(0, 120) + "…"
                            : item.message}
                      </p>

                      {item.message.length > 120 && (
                        <button
                          onClick={() =>
                            setExpandedId(
                              expandedId === item.id ? null : item.id,
                            )
                          }
                          className="mt-1 text-xs text-gray-500 hover:text-cyan-400 cursor-pointer"
                        >
                          {expandedId === item.id ? "Скрыть" : "Показать полностью"}
                        </button>
                      )}

                      {item.pageUrl && (
                        <a
                          href={item.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-xs text-gray-500 hover:text-cyan-400 underline"
                        >
                          {item.pageUrl}
                        </a>
                      )}

                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <span>Автор: {getAuthorLabel(item)}</span>
                        {uid && (
                          <button
                            onClick={() =>
                              setRewardingId(
                                rewardingId === item.id ? null : item.id,
                              )
                            }
                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                          >
                            <Crown size={14} />
                            Наградить
                          </button>
                        )}
                        {!uid && (
                          <span className="text-gray-600">
                            (аноним — нельзя наградить)
                          </span>
                        )}
                      </div>

                      {rewardingId === item.id && uid && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">
                            Выдать Pro на:
                          </span>
                          {REWARD_OPTIONS.map((opt) => (
                            <button
                              key={opt.days}
                              onClick={() => handleReward(uid, opt.days)}
                              disabled={rewarding}
                              className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 rounded-lg text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {opt.label}
                            </button>
                          ))}
                          <button
                            onClick={() => setRewardingId(null)}
                            className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer"
                          >
                            Отмена
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(item.id, e.target.value)
                        }
                        className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                      >
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <option key={key} value={key}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={loadMoreRef} className="py-4 text-center">
              {isFetchingNextPage && (
                <span className="text-gray-500 text-sm">Загрузка…</span>
              )}
              {!hasNextPage && !isFetchingNextPage && feedback.length > 0 && (
                <span className="text-gray-500 text-sm">
                  Все сообщения загружены
                </span>
              )}
            </div>
          </div>
        )}

        <EditorConfirmModal
          isOpen={deleteConfirmId !== null}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() =>
            deleteConfirmId && handleDelete(deleteConfirmId)
          }
          title="Удалить отзыв?"
          titleId="delete-feedback-title"
          confirmLabel="Удалить"
          description={
            <p>Это действие нельзя отменить.</p>
          }
        />
      </div>
    </div>
  );
}
