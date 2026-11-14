import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, CornerDownLeft, Headphones, MessageSquareHeart } from "lucide-react";
import { useSupportChat } from "@/hooks/useSupportChat";
import { apiTrackEvent } from "@/lib/analyticsApi";
import type { SupportMessageDto } from "../../../shared/types";

export interface SupportWidgetProps {
  onOpenFeedbackSurvey?: () => void;
}

export function SupportWidget({ onOpenFeedbackSurvey }: SupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<SupportMessageDto | null>(null);

  const { messages, unreadCount, sendMessage, isSending, markAsRead } = useSupportChat({
    isChatOpen: isOpen,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Скролл вниз при обновлении сообщений
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      markAsRead();
    }
  }, [isOpen, messages.length, markAsRead]);

  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      apiTrackEvent("support.chat_opened");
    } else {
      setIsOpen(false);
      setReplyingTo(null);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    try {
      await sendMessage(text, replyingTo?.id);
      setInputText("");
      setReplyingTo(null);
    } catch (err) {
      console.warn("[SupportWidget] Failed to send message:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Плавающая кнопка вызова чата в правом нижнем углу */}
      <div className="fixed right-6 z-40 max-md:right-4 support-widget-bottom transition-[bottom] duration-200">
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Поддержка и связь с нами"
          className="group relative flex size-13 items-center justify-center rounded-full border border-amber-200/30 bg-[#16161a] text-amber-200 shadow-[0_8px_30px_rgba(0,0,0,0.7)] backdrop-blur-md transition-all hover:scale-105 hover:border-amber-200/60 hover:bg-[#202026] active:scale-95 cursor-pointer"
        >
          {isOpen ? (
            <X size={22} className="transition-transform group-hover:rotate-90" />
          ) : (
            <MessageCircle size={22} className="transition-transform group-hover:scale-110" />
          )}

          {/* Бейдж непрочитанных ответов */}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Окно чата */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed right-6 z-50 flex h-[520px] max-h-[82vh] w-[360px] max-w-[calc(100vw-32px)] flex-col rounded-2xl border border-amber-200/25 bg-[#121215] text-[#f3efe6] shadow-[0_12px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl max-md:right-4 overflow-hidden support-chat-bottom transition-[bottom] duration-200"
          >
            {/* Шапка чата */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex size-8 items-center justify-center rounded-full bg-amber-400/10 border border-amber-300/30 text-amber-300">
                  <Headphones size={16} />
                  <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-400 ring-2 ring-[#121215]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white leading-tight">
                    Поддержка BookStrata
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    На связи • Ответим в ближайшее время
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                aria-label="Свернуть чат"
                className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Лента сообщений */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-4 text-gray-400">
                  <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-200 mb-3">
                    <MessageCircle size={22} />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">
                    Здравствуйте! Чем можем помочь?
                  </p>
                  <p className="text-xs text-gray-400 max-w-[220px]">
                    Напишите нам вопрос, идею или предложение по сайту.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.senderRole === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`relative rounded-2xl p-3 text-xs leading-relaxed max-w-[85%] break-words ${
                          isUser
                            ? "bg-amber-400/20 text-amber-50 border border-amber-300/30 rounded-tr-sm"
                            : "bg-white/10 text-white border border-white/10 rounded-tl-sm"
                        }`}
                      >
                        {/* Имя команды для админа */}
                        {!isUser && (
                          <div className="text-[10px] font-bold text-amber-300 mb-1 flex items-center gap-1">
                            <span>Команда BookStrata</span>
                          </div>
                        )}

                        {/* Блок цитирования, если сообщение — ответ на другое */}
                        {msg.replyTo && (
                          <div className="mb-1.5 rounded border-l-2 border-amber-300/60 bg-black/30 px-2 py-1 text-[11px] text-gray-300">
                            <div className="font-semibold text-amber-200/80 text-[10px]">
                              {msg.replyTo.senderRole === "admin" ? "Команда BookStrata" : "Вы"}
                            </div>
                            <div className="line-clamp-1 opacity-90">{msg.replyTo.text}</div>
                          </div>
                        )}

                        {/* Текст сообщения */}
                        <div>{msg.text}</div>

                        {/* Время и кнопка ответа */}
                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px] text-gray-400">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Кнопка быстрого ответа (Reply) при наведении */}
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(msg);
                          textareaRef.current?.focus();
                        }}
                        title="Ответить на это сообщение"
                        aria-label="Ответить"
                        className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                      >
                        <CornerDownLeft size={11} />
                        <span>Ответить</span>
                      </button>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Блок цитаты перед полем ввода */}
            {replyingTo && (
              <div className="flex items-center justify-between border-t border-amber-200/20 bg-amber-400/[0.08] px-3 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 overflow-hidden text-amber-100">
                  <CornerDownLeft size={12} className="shrink-0 text-amber-300" />
                  <span className="text-[11px] text-amber-300 font-medium shrink-0">Ответ на:</span>
                  <span className="truncate text-[11px] opacity-80">{replyingTo.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Отменить ответ"
                  className="text-gray-400 hover:text-white ml-2 cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Нижняя панель ввода */}
            <form onSubmit={handleSend} className="border-t border-white/10 bg-white/[0.02] p-2.5">
              <div className="flex items-end gap-2 rounded-xl border border-white/15 bg-black/50 p-1.5 focus-within:border-amber-200/50 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Напишите сообщение..."
                  rows={1}
                  maxLength={2000}
                  className="flex-1 max-h-24 min-h-[34px] resize-none bg-transparent px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  aria-label="Отправить сообщение"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-black transition-all hover:bg-amber-100 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Ссылка на опрос/фидбек */}
              {onOpenFeedbackSurvey && (
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenFeedbackSurvey();
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-amber-200 transition-colors cursor-pointer"
                  >
                    <MessageSquareHeart size={12} />
                    <span>Оценить сайт или оставить отзыв</span>
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
