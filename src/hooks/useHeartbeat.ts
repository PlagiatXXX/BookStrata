import { useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import { getAuthToken } from "@/lib/authApi";

/**
 * Отправляет heartbeat каждые 60 секунд, пока пользователь авторизован
 * и страница видима. Используется для отслеживания lastActivityAt
 * и накопления totalActiveMinutes.
 */
export function useHeartbeat() {
  const token = getAuthToken();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;

    const sendHeartbeat = () => {
      if (document.visibilityState === "visible") {
        api.post("/users/heartbeat").catch(() => {
          // Ошибка не критична — heartbeat опциональный
        });
      }
    };

    // Первый heartbeat сразу после монтирования
    sendHeartbeat();

    // Каждые 60 секунд
    intervalRef.current = setInterval(sendHeartbeat, 60000);

    // Отправляем heartbeat при скрытии страницы (закрытие вкладки)
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [token]);
}
