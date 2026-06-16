import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bug,
  MessageCircle,
  Lightbulb,
  HelpCircle,
  X,
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuthContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { sendFeedback } from "@/lib/feedbackApi";

const TYPES = [
  { value: "bug", label: "Баг", icon: Bug },
  { value: "feature", label: "Предложение", icon: Lightbulb },
  { value: "other", label: "Другое", icon: HelpCircle },
] as const;

function FeedbackForm({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<string>("bug");
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");

    try {
      await sendFeedback({
        type: type as "bug" | "feature" | "other",
        message: message.trim(),
        pageUrl: window.location.href,
        userEmail: user ? undefined : userEmail.trim() || undefined,
      });
      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setMessage("");
        setUserEmail("");
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-background-dark rounded-2xl border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-white">
          {sent ? "Отправлено!" : "Обратная связь"}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>
      </div>

      {sent ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send size={28} className="text-emerald-400" />
          </div>
          <p className="text-gray-300">
            Спасибо! Мы рассмотрим ваше сообщение.
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Тип
            </label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map((t) => {
                const Icon = t.icon;
                const isActive = type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer flex-1 min-w-0 ${
                      isActive
                        ? "bg-violet-600/30 text-violet-300 border border-violet-500/50"
                        : "bg-slate-800/50 text-gray-400 border border-slate-700/50 hover:text-gray-200"
                    }`}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="feedback-message"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Описание
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите проблему или предложение..."
              maxLength={5000}
              rows={4}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          {!user && (
            <div>
              <label
                htmlFor="feedback-email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email (для связи)
              </label>
              <input
                id="feedback-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={sending || !message.trim()}
            className="w-full py-3 bg-linear-to-r from-violet-600 to-fuchsia-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-500 hover:to-fuchsia-500 transition-all cursor-pointer"
          >
            {sending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      )}
    </div>
  );
}

export function FeedbackButton({ raised = false }: { raised?: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  useBodyScrollLock(showForm);
  const navigate = useNavigate();

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleFeedback = useCallback(() => {
    closeMenu();
    setShowForm(true);
  }, [closeMenu]);

  const handleAbout = useCallback(() => {
    closeMenu();
    navigate("/about");
  }, [closeMenu, navigate]);

  return (
    <>
      {/* Модальное окно обратной связи */}
      {showForm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <FeedbackForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* Плавающее меню */}
      <div className={`fixed right-6 z-50 flex flex-col items-end gap-3 bottom-6 ${raised ? "bottom-16 lg:bottom-6" : ""}`}>
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Кнопка "О проекте" */}
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center gap-3"
              >
                <span className="text-sm text-gray-300 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg whitespace-nowrap">
                  О проекте
                </span>
                <button
                  onClick={handleAbout}
                  className="w-14 h-14 bg-linear-to-r from-sky-500 to-indigo-500 rounded-full shadow-2xl shadow-sky-900/50 flex items-center justify-center hover:scale-105 transition-all cursor-pointer shrink-0"
                  aria-label="О проекте"
                  title="О проекте"
                >
                  <HelpCircle size={24} className="text-white" />
                </button>
              </motion.div>

              {/* Кнопка "Обратная связь" */}
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="text-sm text-gray-300 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg whitespace-nowrap">
                  Обратная связь
                </span>
                <button
                  onClick={handleFeedback}
                  className="w-14 h-14 bg-linear-to-r from-violet-600 to-fuchsia-600 rounded-full shadow-2xl shadow-violet-900/50 flex items-center justify-center hover:scale-105 transition-all cursor-pointer shrink-0"
                  aria-label="Обратная связь"
                  title="Обратная связь"
                >
                  <MessageCircle size={24} className="text-white" />
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Кнопка-триггер */}
        <button
          onClick={toggleMenu}
          className="w-14 h-14 bg-linear-to-r from-violet-600 to-fuchsia-600 rounded-full shadow-2xl shadow-violet-900/50 flex items-center justify-center hover:scale-105 transition-all cursor-pointer relative"
          aria-label={isMenuOpen ? "Закрыть меню" : "Меню"}
          title={isMenuOpen ? "Закрыть" : "Меню"}
        >
          <AnimatePresence mode="wait">
            {isMenuOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X size={24} className="text-white" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageCircle size={24} className="text-white" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );
}
