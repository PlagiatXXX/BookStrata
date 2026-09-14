import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { onSessionExpired } from "@/lib/sessionExpired";
import { createLogger } from "@/lib/logger";

const logger = createLogger("SessionExpired", { color: "red" });

const REDIRECT_DELAY_SEC = 5;

/**
 * Полноэкранный экран при истёкшей сессии.
 *
 * Появляется когда:
 * - Access token истёк
 * - Refresh token невалиден / отозван
 * - Все попытки refresh исчерпаны
 *
 * Поведение:
 * - Показывает понятное сообщение с обратным отсчётом
 * - Через 5 секунд автоматически перенаправляет на /auth
 * - Сохраняет текущий URL для возврата после повторного входа
 * - Кнопка «Войти заново» — немедленный редирект
 */
export function SessionExpiredOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_DELAY_SEC);

  const redirectToAuth = useCallback(() => {
    const currentPath = location.pathname + location.search;
    const authUrl = `/auth?redirect=${encodeURIComponent(currentPath)}`;
    logger.info("Session expired — redirecting to /auth", { from: currentPath });
    navigate(authUrl, { replace: true });
  }, [navigate, location]);

  useEffect(() => {
    return onSessionExpired(() => {
      setVisible(true);
      setSecondsLeft(REDIRECT_DELAY_SEC);
    });
  }, []);

  // Обратный отсчёт
  useEffect(() => {
    if (!visible) return;
    if (secondsLeft <= 0) {
      redirectToAuth();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [visible, secondsLeft, redirectToAuth]);

  // Блокируем скролл body пока overlay виден
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center"
      >
        <div className="flex justify-center mb-5">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Сессия истекла
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Для продолжения работы необходимо войти в аккаунт.
          <br />
          Перенаправление через{" "}
          <span className="font-mono font-bold text-gray-700">{secondsLeft}</span>{" "}
          {secondsLeft === 1 ? "секунду" : secondsLeft <= 4 ? "секунды" : "секунд"}…
        </p>

        <button
          onClick={redirectToAuth}
          className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
        >
          Войти заново
        </button>

        <p className="mt-4 text-xs text-gray-400">
          После входа вы вернётесь на текущую страницу
        </p>
      </motion.div>
    </div>
  );
}
