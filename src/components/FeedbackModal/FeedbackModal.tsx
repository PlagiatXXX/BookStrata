import { useState, useEffect, useCallback, useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ArrowLeft, Send, CheckCircle2, MessageCircle, ExternalLink } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export interface FeedbackModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onSubmit: (input: { rating: "great" | "neutral" | "bad"; message?: string }) => Promise<void>;
}

type Step = "rating" | "details" | "success";
type RatingValue = "great" | "neutral" | "bad";

const TELEGRAM_URL = "https://t.me/bookstrata";
const VK_URL = "https://vk.ru/club237287277";

const RATINGS: { value: RatingValue; emoji: string; label: string; desc: string }[] = [
  { value: "great", emoji: "😍", label: "Всё отлично", desc: "Удобно и понятно" },
  { value: "neutral", emoji: "🤔", label: "Есть вопросы / идеи", desc: "Чего-то не хватает" },
  { value: "bad", emoji: "🙁", label: "Неудобно / сложно", desc: "Трудно разобраться" },
];

export function FeedbackModal({ isOpen, onDismiss, onSubmit }: FeedbackModalProps) {
  useBodyScrollLock(isOpen);

  const [step, setStep] = useState<Step>("rating");
  const [selectedRating, setSelectedRating] = useState<RatingValue | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const titleId = useId();
  const descId = useId();

  // Сброс формы при повторном открытии
  useEffect(() => {
    if (isOpen) {
      setStep("rating");
      setSelectedRating(null);
      setMessage("");
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDismiss]);

  const handleSelectRating = (rating: RatingValue) => {
    setSelectedRating(rating);
    setStep("details");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRating || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        rating: selectedRating,
        message: message.trim() || undefined,
      });
      setStep("success");
    } catch {
      setSubmitError("Не удалось отправить отзыв. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDetailsPrompt = useCallback(() => {
    if (selectedRating === "great") {
      return "Что вам больше всего нравится на сайте?";
    }
    return "Чего вам не хватило или что вызвало трудности?";
  }, [selectedRating]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
        >
          {/* Атмосферный ореол дымки сзади */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(193,255,254,0.08)_0%,transparent_65%)]" />

          {/* Карточка: появление из дыма и растворение */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-amber-200/20 bg-[#121214] p-6 text-[#f3efe6] shadow-[0_0_60px_rgba(0,0,0,0.85)] backdrop-blur-xl max-h-[90dvh] overflow-y-auto"
            initial={{ opacity: 0, filter: "blur(24px)", scale: 0.94 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(28px)", scale: 1.05 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Кнопка закрытия */}
            <button
              onClick={onDismiss}
              aria-label="Закрыть"
              type="button"
              className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-colors hover:border-amber-200/30 hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>

            {/* ШАГ 1: ВЫБОР РЕАКЦИИ */}
            {step === "rating" && (
              <div className="space-y-5">
                <div>
                  <h3 id={titleId} className="text-xl font-bold tracking-tight text-white">
                    Помогите нам стать лучше
                  </h3>
                  <p id={descId} className="mt-1 text-xs text-gray-400">
                    Как вам BookStrata? Поделитесь первым впечатлением в один клик:
                  </p>
                </div>

                <div className="space-y-2.5">
                  {RATINGS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleSelectRating(item.value)}
                      className="group flex w-full items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition-all hover:border-amber-200/40 hover:bg-white/[0.08] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      <span className="text-2xl transition-transform group-hover:scale-110">
                        {item.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white">{item.label}</div>
                        <div className="text-xs text-gray-400">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Блок сообщества */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 pt-3">
                  <p className="text-[11px] font-medium text-gray-400 mb-2">
                    Присоединяйтесь к нашим сообществам для книжных обсуждений и новостей:
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-[#06bcf9]/40 hover:bg-[#06bcf9]/10 hover:text-[#06bcf9]"
                    >
                      <span>✈️</span> Telegram
                      <ExternalLink size={12} className="opacity-60" />
                    </a>
                    <a
                      href={VK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-[#4c75a3]/40 hover:bg-[#4c75a3]/10 hover:text-[#7ba2cc]"
                    >
                      <span>🔵</span> ВКонтакте
                      <ExternalLink size={12} className="opacity-60" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ШАГ 2: УТОЧНЯЮЩИЙ ОТЗЫВ */}
            {step === "details" && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("rating")}
                    className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:border-white/20 hover:text-white cursor-pointer"
                    aria-label="Назад к оценке"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-xs text-amber-200/80 font-medium">
                    {RATINGS.find((r) => r.value === selectedRating)?.emoji}{" "}
                    {RATINGS.find((r) => r.value === selectedRating)?.label}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">
                    {getDetailsPrompt()}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Любая обратная связь помогает сделать сайт полезнее.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Напишите пару слов... (необязательно)"
                    rows={3}
                    maxLength={2000}
                    className="w-full resize-none rounded-xl border border-white/15 bg-black/40 p-3 text-sm text-white placeholder-gray-500 focus:border-amber-200/50 focus:outline-none focus:ring-1 focus:ring-amber-200/50 transition-colors"
                  />
                  <div className="text-right text-[10px] text-gray-500">
                    {message.length} / 2000
                  </div>
                </div>

                {submitError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                    {submitError}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-amber-100 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(253,230,138,0.2)]"
                  >
                    {isSubmitting ? (
                      <span>Отправка...</span>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Отправить отзыв</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ШАГ 3: БЛАГОДАРНОСТЬ */}
            {step === "success" && (
              <div className="space-y-5 py-2 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 size={26} />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">Спасибо за отзыв! ❤️</h3>
                  <p className="mt-1.5 text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                    Мы внимательно читаем каждое сообщение и делаем сайт удобнее для вас.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <p className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-[#06bcf9]" />
                    Заглядывайте в наши сообщества:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-[#06bcf9]/40 hover:bg-[#06bcf9]/10 hover:text-[#06bcf9]"
                    >
                      <span>✈️</span> Telegram
                      <ExternalLink size={12} className="opacity-60" />
                    </a>
                    <a
                      href={VK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-[#4c75a3]/40 hover:bg-[#4c75a3]/10 hover:text-[#7ba2cc]"
                    >
                      <span>🔵</span> ВКонтакте
                      <ExternalLink size={12} className="opacity-60" />
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onDismiss}
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
