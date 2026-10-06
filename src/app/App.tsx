import { Suspense, useEffect } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { Toaster } from "sileo";
import { Spinner } from "@/components/Spinner";
import { AchievementNotification } from "@/components/AchievementNotification/AchievementNotification";
import { useAchievementNotifications } from "@/hooks/useAchievementNotifications";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { SessionExpiredOverlay } from "@/components/SessionExpiredOverlay";
import { restoreBookReturnScroll } from "@/utils/bookNavigation";
import { AppProviders } from "./AppProviders";
import "../styles/sileo-custom.css";

/** Внутренний контент, рендерится внутри AppProviders — хуки зависящие от AuthProvider безопасны */
function AppShellInner() {
  const { newAchievement, clearNotification } = useAchievementNotifications();
  useAnalyticsTracker();

  return (
    <>
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
        <main>
          <Outlet />
        </main>
      </Suspense>
      <ScrollRestoration />
      <Toaster position="top-center" theme="system" />
      <SessionExpiredOverlay />
      <AchievementNotification
        achievement={newAchievement}
        onClose={clearNotification}
      />
    </>
  );
}

function AppShell() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = `${pathname}${window.location.search}`;
    // setTimeout(0) ensures this runs AFTER React Router's ScrollRestoration
    // which processes popstate synchronously. Without it, our restore fires
    // first and RR overwrites it with its own (wrong) position.
    let cleanupRestore: (() => void) | null = null;
    let frameId = 0;
    const timer = setTimeout(() => {
      frameId = requestAnimationFrame(() => {
        cleanupRestore = restoreBookReturnScroll(path);
      });
    }, 0);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
      cleanupRestore?.();
    };
  }, [pathname]);

  return (
    <AppProviders>
      <AppShellInner />
    </AppProviders>
  );
}
export default AppShell;
