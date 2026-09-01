import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sileo";
import { Spinner } from "@/components/Spinner";
import { AchievementNotification } from "@/components/AchievementNotification/AchievementNotification";
import { useAchievementNotifications } from "@/hooks/useAchievementNotifications";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { FeedbackButton } from "@/components/FeedbackButton/FeedbackButton";
import { AppProviders } from "./AppProviders";
import "../styles/sileo-custom.css";

function AppShell() {
  const { pathname } = useLocation();
  const { newAchievement, clearNotification } = useAchievementNotifications();
  useAnalyticsTracker();
  const prevPathname = useRef(pathname);
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const restoringScroll = useRef(false);

  // Отключаем нативное восстановление скролла браузера —
  // оно конфликтует и отправляет пользователей в футер при «Назад».
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const onPopState = () => {
      restoringScroll.current = true;
      const saved = scrollPositions.current.get(window.location.pathname) ?? 0;
      window.scrollTo(0, saved);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // При смене маршрута — сохраняем позицию старой страницы и скроллим наверх.
  // При «Назад» (popstate) — пропускаем, позиция уже восстановлена.
  useEffect(() => {
    if (restoringScroll.current) {
      restoringScroll.current = false;
      prevPathname.current = pathname;
      return;
    }
    scrollPositions.current.set(prevPathname.current, window.scrollY);
    window.scrollTo(0, 0);
    prevPathname.current = pathname;
  }, [pathname]);

  return (
    <AppProviders>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-400">Загрузка...</p>
            </div>
          </div>
        }
      >
        <main><Outlet /></main>
      </Suspense>
      <Toaster position="top-center" theme="system" />
      <AchievementNotification achievement={newAchievement} onClose={clearNotification} />
      {!pathname.match(/^\/tier-lists\/[^/]+\/?$/) && (
        <FeedbackButton
          raised={false}
          withNavMargin={pathname !== "/"}
        />
      )}
    </AppProviders>
  );
}
export default AppShell;
