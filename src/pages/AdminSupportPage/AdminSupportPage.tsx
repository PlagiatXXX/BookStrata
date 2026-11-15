import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageCircle,
  Trash2,
  CheckCircle,
  Send,
  CornerDownLeft,
  X,
  User,
  Search,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import { EditorConfirmModal } from "@/components/EditorModals/EditorConfirmModal";
import { AdminNewChatModal } from "./AdminNewChatModal";
import { useDebounce } from "@/hooks/useDebounce";
import { sileo } from "sileo";
import {
  apiAdminGetSupportThreads,
  apiAdminGetThreadMessages,
  apiAdminReplySupportThread,
  apiAdminDeleteSupportMessage,
  apiAdminDeleteSupportThread,
  apiAdminUpdateSupportThreadStatus,
  apiAdminGetOrCreateUserThread,
} from "@/lib/supportApi";
import type { SupportMessageDto, SupportUserSearchResultDto } from "../../../shared/types";

export default function AdminSupportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const selectedThreadId = searchParams.get("thread") ? Number(searchParams.get("thread")) : null;
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<SupportMessageDto | null>(null);

  const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);
  const [deleteThreadId, setDeleteThreadId] = useState<number | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSelectThread = (id: number) => {
    setSearchParams({ thread: String(id) });
    setReplyingTo(null);
  };

  const createThreadMutation = useMutation({
    mutationFn: (userId: number) => apiAdminGetOrCreateUserThread(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-threads"] });
      setSearchParams({ thread: String(data.threadId) });
      setIsNewChatOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    },
    onError: () => {
      sileo.error({ title: "Не удалось открыть диалог с пользователем" });
    },
  });

  const handleSelectUserForChat = (user: SupportUserSearchResultDto) => {
    createThreadMutation.mutate(user.id);
  };

  // Список всех тредов
  const { data: threadsData, isLoading: isThreadsLoading } = useQuery({
    queryKey: ["admin-support-threads", statusFilter, debouncedSearch],
    queryFn: () =>
      apiAdminGetSupportThreads({
        status: statusFilter,
        search: debouncedSearch || undefined,
      }),
    refetchInterval: 5000,
  });

  // Выбранный диалог и его переписка
  const { data: threadDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["admin-support-thread", selectedThreadId],
    queryFn: () => (selectedThreadId ? apiAdminGetThreadMessages(selectedThreadId) : null),
    enabled: Boolean(selectedThreadId),
    refetchInterval: 3000,
  });

  const threads = threadsData?.threads ?? [];
  const currentThread = threadDetail?.thread;
  const currentMessages = threadDetail?.messages ?? [];

  // Скролл вниз при обновлении сообщений
  useEffect(() => {
    if (selectedThreadId && currentMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedThreadId, currentMessages.length]);

  // Мутация ответа
  const replyMutation = useMutation({
    mutationFn: ({ threadId, text, replyToId }: { threadId: number; text: string; replyToId?: number }) =>
      apiAdminReplySupportThread(threadId, { text, replyToId }),
    onSuccess: () => {
      setReplyText("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["admin-support-thread", selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-threads"] });
      sileo.success({ title: "Ответ отправлен" });
    },
    onError: () => {
      sileo.error({ title: "Не удалось отправить ответ" });
    },
  });

  // Мутация удаления отдельного сообщения
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: number) => apiAdminDeleteSupportMessage(messageId),
    onSuccess: () => {
      setDeleteMessageId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-support-thread", selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-threads"] });
      sileo.success({ title: "Сообщение удалено" });
    },
    onError: () => {
      sileo.error({ title: "Ошибка при удалении сообщения" });
    },
  });

  // Мутация полной очистки/удаления чата
  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: number) => apiAdminDeleteSupportThread(threadId),
    onSuccess: () => {
      setDeleteThreadId(null);
      setSearchParams({});
      queryClient.invalidateQueries({ queryKey: ["admin-support-threads"] });
      sileo.success({ title: "Чат диалога полностью очищен и удален" });
    },
    onError: () => {
      sileo.error({ title: "Ошибка при удалении диалога" });
    },
  });

  // Мутация статуса
  const statusMutation = useMutation({
    mutationFn: ({ threadId, status }: { threadId: number; status: string }) =>
      apiAdminUpdateSupportThreadStatus(threadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-thread", selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-threads"] });
      sileo.success({ title: "Статус обновлен" });
    },
  });

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedThreadId || !replyText.trim() || replyMutation.isPending) return;
    replyMutation.mutate({
      threadId: selectedThreadId,
      text: replyText.trim(),
      replyToId: replyingTo?.id,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] py-6 sm:py-10 text-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Верхняя навигация */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>Назад в панель управления</span>
          </button>

          <Link
            to="/admin/feedback"
            className="text-xs text-amber-200/80 hover:text-amber-200 hover:underline flex items-center gap-1.5"
          >
            <span>Перейти к отзывам и опросам</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-3">
              <MessageCircle size={28} className="text-amber-300" />
              <span>Поддержка пользователей</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Внутренние чаты между администрацией и читателями
            </p>
          </div>
        </div>

        {/* Сетка Split-View */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[620px]">
          {/* ЛЕВАЯ КОЛОНКА: СПИСОК ТРЕДОВ */}
          <div className="md:col-span-4 flex flex-col rounded-2xl border border-white/10 bg-[#141418] p-4 shadow-xl">
            {/* Кнопка создания нового диалога с пользователем */}
            <button
              type="button"
              onClick={() => setIsNewChatOpen(true)}
              className="w-full mb-3 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-400/10 border border-amber-300/30 text-amber-200 hover:bg-amber-400/20 hover:border-amber-300/50 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <UserPlus size={15} />
              <span>Написать пользователю</span>
            </button>

            {/* Фильтры */}
            <div className="flex items-center gap-1.5 mb-3 bg-white/5 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  statusFilter === "all" ? "bg-amber-300 text-black font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("open")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  statusFilter === "open" ? "bg-amber-300 text-black font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                Ждут ответа
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("resolved")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  statusFilter === "resolved" ? "bg-amber-300 text-black font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                Решено
              </button>
            </div>

            {/* Поиск */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени или тексту..."
                className="w-full rounded-xl border border-white/10 bg-black/40 pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-amber-300/50 focus:outline-none"
              />
            </div>

            {/* Список тредов */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px] scrollbar-thin scrollbar-thumb-white/10">
              {isThreadsLoading && (
                <div className="py-8 text-center text-xs text-gray-400">Загрузка диалогов...</div>
              )}

              {!isThreadsLoading && threads.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-500">Диалогов не найдено</div>
              )}

              {threads.map((t) => {
                const isSelected = t.id === selectedThreadId;
                const lastMsg = t.messages?.[0];
                const authorName = t.user?.username || `Гость #${t.id}`;
                const hasUnread = t.unreadByAdmin > 0;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectThread(t.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "border-amber-300/60 bg-amber-400/10 shadow-[0_0_15px_rgba(253,230,138,0.15)]"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-7 rounded-full bg-white/10 flex items-center justify-center text-amber-200 text-xs font-bold shrink-0">
                          {t.user?.username ? t.user.username.charAt(0).toUpperCase() : <User size={14} />}
                        </div>
                        <span className="text-xs font-semibold text-white truncate">{authorName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasUnread && (
                          <span className="size-2 rounded-full bg-rose-500 animate-pulse" title="Новое сообщение" />
                        )}
                        <span className="text-[10px] text-gray-500">
                          {new Date(t.lastMessageAt).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-400 truncate line-clamp-1">
                      {lastMsg ? lastMsg.text : "Нет сообщений"}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        t.status === "open"
                          ? "bg-amber-400/20 text-amber-300"
                          : t.status === "answered"
                          ? "bg-blue-400/20 text-blue-300"
                          : "bg-emerald-400/20 text-emerald-300"
                      }`}>
                        {t.status === "open" ? "Ждет ответа" : t.status === "answered" ? "Отвечен" : "Решен"}
                      </span>
                      {t.unreadByAdmin > 0 && (
                        <span className="text-rose-400 font-bold">+{t.unreadByAdmin} новых</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: ПЕРЕПИСКА В ТРЕДЕ */}
          <div className="md:col-span-8 flex flex-col rounded-2xl border border-white/10 bg-[#141418] shadow-xl overflow-hidden min-h-[600px]">
            {!selectedThreadId ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-500">
                <div className="size-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-3">
                  <MessageCircle size={28} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Выберите диалог</h3>
                <p className="text-xs text-gray-400 max-w-sm">
                  Выберите пользователя из списка слева, чтобы просмотреть переписку и ответить.
                </p>
              </div>
            ) : isDetailLoading ? (
              <div className="flex flex-1 items-center justify-center text-gray-400 text-xs">
                Загрузка сообщений...
              </div>
            ) : (
              <>
                {/* Шапка активного диалога */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-amber-400/10 border border-amber-300/30 flex items-center justify-center text-amber-300 font-bold text-sm">
                      {currentThread?.user?.username ? currentThread.user.username.charAt(0).toUpperCase() : <User size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {currentThread?.user?.username || `Гость #${currentThread?.id}`}
                        </span>
                        {currentThread?.user && (
                          <Link
                            to={`/user/${currentThread.user.id}`}
                            target="_blank"
                            className="text-gray-400 hover:text-amber-200 transition-colors"
                            title="Открыть профиль"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-2">
                        <span>{currentThread?.user?.email || "Email не указан"}</span>
                        <span>•</span>
                        <span>
                          {new Date(currentThread?.createdAt || "").toLocaleString("ru-RU", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Переключатель статуса */}
                    <button
                      type="button"
                      onClick={() =>
                        statusMutation.mutate({
                          threadId: currentThread!.id,
                          status: currentThread!.status === "resolved" ? "open" : "resolved",
                        })
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        currentThread?.status === "resolved"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <CheckCircle size={13} />
                      <span>{currentThread?.status === "resolved" ? "Решено" : "Отметить решенным"}</span>
                    </button>

                    {/* Очистить / удалить весь чат */}
                    <button
                      type="button"
                      onClick={() => setDeleteThreadId(currentThread!.id)}
                      title="Очистить и удалить весь чат"
                      aria-label="Очистить чат"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Очистить чат</span>
                    </button>
                  </div>
                </div>

                {/* Лента сообщений */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3.5 max-h-[440px] scrollbar-thin scrollbar-thumb-white/10">
                  {currentMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-500">В этом диалоге нет сообщений</div>
                  ) : (
                    currentMessages.map((msg) => {
                      const isUser = msg.senderRole === "user";
                      return (
                        <div
                          key={msg.id}
                          className={`group relative flex flex-col ${isUser ? "items-start" : "items-end"}`}
                        >
                          <div
                            className={`relative rounded-2xl p-3.5 text-xs leading-relaxed max-w-[80%] break-words ${
                              isUser
                                ? "bg-white/10 text-white border border-white/10 rounded-tl-sm"
                                : "bg-amber-400/20 text-amber-50 border border-amber-300/30 rounded-tr-sm"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-gray-400 font-medium">
                              <span className={isUser ? "text-gray-300" : "text-amber-300 font-bold"}>
                                {isUser
                                  ? currentThread?.user?.username || `Гость #${currentThread?.id}`
                                  : "Вы (Администратор)"}
                              </span>
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            {/* Блок цитирования */}
                            {msg.replyTo && (
                              <div className="mb-2 rounded border-l-2 border-amber-300/70 bg-black/40 px-2.5 py-1.5 text-[11px] text-gray-300">
                                <div className="font-semibold text-amber-200/90 text-[10px]">
                                  {msg.replyTo.senderRole === "admin" ? "Администратор" : "Пользователь"}
                                </div>
                                <div className="line-clamp-2 opacity-90">{msg.replyTo.text}</div>
                              </div>
                            )}

                            <div>{msg.text}</div>
                          </div>

                          {/* Действия над сообщением (Reply + Удаление) */}
                          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(msg);
                                textareaRef.current?.focus();
                              }}
                              aria-label="Ответить"
                              className="text-[10px] text-gray-400 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                            >
                              <CornerDownLeft size={11} />
                              <span>Ответить</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteMessageId(msg.id)}
                              aria-label="Удалить сообщение"
                              className="text-[10px] text-gray-400 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={11} />
                              <span>Удалить</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Баннер цитирования перед полем ответа */}
                {replyingTo && (
                  <div className="flex items-center justify-between border-t border-amber-200/20 bg-amber-400/[0.08] px-4 py-2 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden text-amber-100">
                      <CornerDownLeft size={13} className="shrink-0 text-amber-300" />
                      <span className="text-xs text-amber-300 font-semibold shrink-0">Ответ на сообщение:</span>
                      <span className="truncate text-xs opacity-90">{replyingTo.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      aria-label="Отменить ответ"
                      className="text-gray-400 hover:text-white cursor-pointer ml-2"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Поле ответа */}
                <form onSubmit={handleSendReply} className="border-t border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-end gap-3 rounded-xl border border-white/15 bg-black/40 p-2.5 focus-within:border-amber-300/50 transition-colors">
                    <textarea
                      ref={textareaRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Напишите ответ пользователю... (Ctrl+Enter для отправки)"
                      rows={2}
                      className="flex-1 resize-none bg-transparent px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || replyMutation.isPending}
                      aria-label="Отправить ответ"
                      className="flex items-center gap-1.5 rounded-lg bg-amber-300 px-4 py-2 text-xs font-semibold text-black transition-all hover:bg-amber-200 active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      <Send size={13} />
                      <span>Ответить</span>
                    </button>
                  </div>
                  <div className="mt-1.5 text-right text-[10px] text-gray-500">
                    Совет: нажмите Ctrl + Enter для быстрой отправки
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Модальное окно подтверждения удаления сообщения */}
        <EditorConfirmModal
          isOpen={deleteMessageId !== null}
          onClose={() => setDeleteMessageId(null)}
          onConfirm={() => deleteMessageId && deleteMessageMutation.mutate(deleteMessageId)}
          title="Удалить сообщение?"
          description="Это сообщение будет безвозвратно удалено из переписки."
          confirmLabel="Удалить"
          titleId="delete-support-msg-title"
        />

        {/* Модальное окно подтверждения очистки и удаления всего чата */}
        <EditorConfirmModal
          isOpen={deleteThreadId !== null}
          onClose={() => setDeleteThreadId(null)}
          onConfirm={() => deleteThreadId && deleteThreadMutation.mutate(deleteThreadId)}
          title="Очистить и удалить весь диалог?"
          description="Все сообщения этой переписки будут безвозвратно удалены из базы данных."
          confirmLabel="Очистить и удалить"
          titleId="delete-support-thread-title"
        />

        {/* Модальное окно создания нового диалога */}
        <AdminNewChatModal
          isOpen={isNewChatOpen}
          onClose={() => setIsNewChatOpen(false)}
          onSelectUser={handleSelectUserForChat}
          isSubmitting={createThreadMutation.isPending}
        />
      </div>
    </div>
  );
}
