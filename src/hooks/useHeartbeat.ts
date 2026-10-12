import { useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import { getAuthToken } from "@/lib/authApi";
import { apiTrackEvent } from "@/lib/analyticsApi";

/**
 * Отправляет heartbeat каждые 60 секунд, пока пользователь авторизован
 * и страница видима. Используется для отслеживания lastActivityAt,
 * накопления totalActiveMinutes и трекинга сессий в аналитике.
 *
 * Токен читается ВНУТРИ колбэка при каждом вызове, а не во время рендера:
 * при старте приложения в памяти его ещё нет (restoreSession асинхронный),
 * а getAuthToken() — чтение mutable-внешнего состояния, которое React
 * Compiler имеет право закэшировать на время рендера.
 */
export function useHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const doHeartbeat = () => {
      if (!getAuthToken()) return; // не авторизован — heartbeat не нужен
      api.post("/users/heartbeat").catch(() => {
        // Ошибка не критична — heartbeat опциональный
      });
      apiTrackEvent("session_heartbeat");
    };

    // Первый heartbeat сразу после монтирования
    doHeartbeat();

    // Каждые 60 секунд — только если страница видима
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        doHeartbeat();
      }
    }, 60000);

    // Отправляем heartbeat при скрытии страницы (закрытие вкладки)
    // без проверки visibility — в этот момент она уже "hidden"
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        doHeartbeat();
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
  }, []);
}
